# Athena Rule — Visitor Pattern Refactor Plan

## Current State

`athena.ts` implements `checkAthenaAst` / `checkSelect` as a single monolithic recursive function (~270 lines, flagged with `sonarjs/cognitive-complexity`). It processes the SQL AST imperatively using JSONPath queries scattered throughout:

- `$.from..[?(@ && @.table && !@.column)]` — extract table refs
- `"$..from[?(@ && @.type === 'unnest')]"` — extract UNNEST
- `"$..[?(@ && @.type === 'column_ref' && @.column)]"` — find column refs per selected column
- `"$..[?(@ && @.type === 'function' && …)]…"` — find `json_extract_scalar` / `json_extract`
- `"$..[?(@ && @.type === 'column_ref' && @.array_index)]…"` — find JSON-bracket accessors

These ad-hoc JSONPath walks make the control flow hard to follow and will only get harder as new SQL constructs are added (JOINs, subqueries, CASE expressions, etc.).

## What the Visitor Pattern Should Do

A visitor walks the typed AST once, dispatching to typed handlers per node kind. The goal is:

1. **Separation of concerns** — each handler knows exactly one AST node shape.
2. **Typed dispatch** — no `as unknown`, no runtime `@.type === 'foo'` predicates.
3. **Composability** — multiple passes can reuse the same visitor infrastructure.
4. **Testability** — individual visitors can be unit-tested against small AST fixtures.

## AST Node Taxonomy (from `types.ts`)

The PEG grammar produces nodes that fall into these families:

| Node type (`.type` field)         | Interface               | Visitor hook needed |
| --------------------------------- | ----------------------- | ------------------- |
| `"select"`                        | `Select`                | `visitSelect`       |
| `"binary_expr"`                   | `Binary`                | `visitBinary`       |
| `"column_ref"`                    | `ColumnRefItem`         | `visitColumnRef`    |
| `"function"`                      | `Function`              | `visitFunction`     |
| `"aggr_func"`                     | `AggrFunc`              | `visitAggrFunc`     |
| `"cast"`                          | `Cast`                  | `visitCast`         |
| `"case"`                          | `Case`                  | `visitCase`         |
| `"expr_list"`                     | `ExprList`              | `visitExprList`     |
| `"unnest"` (virtual, in `from`)   | `ColumnRefItem` subtype | `visitUnnest`       |
| literal / value nodes             | `ValueExpr`             | `visitValue`        |
| `BaseFrom` / `Join` / `TableExpr` | `From` union            | `visitFrom`         |
| `With` item                       | `With`                  | `visitWith`         |

`Select._next` links UNION branches; those also need traversal via `visitSelect`.

## What Is Missing in `visitor.ts`

The file currently has 5 lines:

```ts
export default function (ast: unknown, context: Context) {
  if (typeof ast !== 'object' || ast === null) {
    return;
  }
}
```

Everything is missing:

### 1. Visitor interface / type map

```ts
// Minimal shape needed
type VisitorMap = {
  visitSelect?(node: Select, ctx: VisitContext): void;
  visitWith?(node: With, ctx: VisitContext): void;
  visitFrom?(node: From, ctx: VisitContext): void;
  visitColumn?(node: Column, ctx: VisitContext): void;
  visitColumnRef?(node: ColumnRefItem, ctx: VisitContext): void;
  visitFunction?(node: Function, ctx: VisitContext): void;
  visitBinary?(node: Binary, ctx: VisitContext): void;
  visitValue?(node: ValueExpr, ctx: VisitContext): void;
  // … etc.
};
```

All hooks should be optional so callers only implement what they care about.

### 2. Typed `VisitContext`

`context.ts` currently defines a `Table` interface (not a context class). We need a mutable context that accumulates resolution state **per SELECT scope**:

```ts
interface VisitContext {
  // resolved service tables keyed by name/alias
  tables: Map<string, ResolvedTable>;
  // columns resolved so far in this SELECT
  columns: Map<string, ResolvedColumn[]>;
  // alias → real-name mapping
  aliases: Map<string, string>;
  // schemas loaded from disk, shared across the whole query
  apiSchemas: Map<string, ApiSchemas[]>;
  // parent context (for CTE / subquery scoping)
  parent?: VisitContext;
}
```

`context.ts` and `column.ts` have started down this road but are incomplete and have incorrect imports (`.ts` extensions in import paths, broken `Context` base class usage).

### 3. `visit(node, ctx)` dispatcher

The core dispatcher needs to:

- Accept `unknown` input (PEG output is not statically typed at boundaries)
- Read `node.type` and call the appropriate handler
- Recursively descend into child nodes

```ts
function visit(node: unknown, ctx: VisitContext, visitor: VisitorMap): void {
  if (typeof node !== 'object' || node === null) return;
  const typed = node as { type?: string };
  switch (typed.type) {
    case 'select':
      return visitor.visitSelect?.(node as Select, ctx);
    case 'binary_expr':
      return visitor.visitBinary?.(node as Binary, ctx);
    case 'column_ref':
      return visitor.visitColumnRef?.(node as ColumnRefItem, ctx);
    case 'function':
      return visitor.visitFunction?.(node as Function, ctx);
    // … etc.
  }
  // fallback: recurse into all object values
}
```

### 4. Per-node child traversal helpers

Each handler should call `visitChildren` (or per-kind helpers) to recurse. Missing helpers:

- `visitSelectChildren(node: Select, ctx, visitor)` — visits `from[]`, `columns[]`, `where`, `groupby`, `_next`
- `visitFromChildren(node: From, ctx, visitor)` — handles `BaseFrom`, `Join` (recurse into `.on`), `TableExpr` (recurse into subquery `.expr.ast`)
- `visitBinaryChildren(node: Binary, ctx, visitor)` — visits `.left` and `.right`
- `visitFunctionChildren(node: Function, ctx, visitor)` — visits `.args.value[]`

### 5. Concrete resolution visitor for `checkSelect` logic

The current `checkSelect` logic should be decomposed into a `ResolutionVisitor` that implements `VisitorMap`:

- `visitWith` → calls `checkSelect` on the CTE body, registers the result in `ctx.tables`
- `visitFrom` → resolves service table → calls `locateApi` + `matchApi` → populates `ctx.tables`
- `visitUnnest` → maps unnested array columns
- `visitColumnRef` inside a `SELECT` column → looks up the column in `ctx.tables`, applies property accessor, records in `ctx.columns`
- `visitFunction` → detects `json_extract_scalar` / `json_extract`, extracts the path argument

### 6. `service-table.ts` needs to be completed

The file duplicates large chunks of `athena.ts` but is incomplete (references `MatchedOperation`, `ResolvedColumn`, `AthenaContext`, `log`, etc. that are not imported). It was apparently started as the extraction destination for service-table logic. Missing:

- Import `MatchedOperation` from `api-matcher`
- Import `ResolvedColumn` (define locally or re-export from `athena.ts`)
- Import `log`, `SCHEMA_STRING`, `SCHEMA_OBJECT`
- Export `buildServiceTable(tableAST, selectAST, apiSchemas): ServiceTable` as the single factory function
- Remove the duplicate `checkSelect` / `checkAthenaAst` body currently pasted in

### 7. `index.ts` needs its commented-out code resolved

`index.ts` has the full `ServiceEndpoint` / `Service` types but all the context/resolver interfaces are commented out. Once `visitor.ts` and `service-table.ts` are solid, these should either be deleted or promoted to the proper types.

### 8. `zzz.spec.ts` is a broken scratch file

`zzz.spec.ts` has syntax errors (`type Table =` with no RHS, calling `visit` instead of `visitSelect`, missing `context` arg). It was clearly a scratch experiment for the visitor idea. It should either become a proper unit test of the visitor once it exists, or be deleted.

## Suggested File Structure After Refactor

```
src/athena/
  types.ts          — unchanged (PEG AST types)
  visitor.ts        — IMPLEMENT: VisitorMap, VisitContext, visit(), visitChildren helpers
  service-table.ts  — COMPLETE: buildServiceTable() factory, ServiceTable type
  context.ts        — REWRITE: VisitContext (replace broken Table/Column class tree)
  column.ts         — REWRITE: ResolvedColumn value type (not a class extending Context)
  index.ts          — CLEAN UP: remove commented-out code once visitor types exist
  athena.ts         — REFACTOR: replace checkSelect monolith with visitor composition
  athena.spec.ts    — unchanged (integration tests)
  zzz.spec.ts       — FIX or DELETE: make it a real visitor unit test
```

## Recommended Implementation Order

1. **Define `VisitContext` in `context.ts`** — the mutable scope object passed through the tree.
2. **Define `VisitorMap` and `visit()` dispatcher in `visitor.ts`** — untyped input → typed dispatch.
3. **Add `visitSelectChildren` and other traversal helpers** — recursive descent wiring.
4. **Refactor `service-table.ts`** — `buildServiceTable()` extracts the FROM-resolution block out of `checkSelect`.
5. **Build `ResolutionVisitor`** — implements `VisitorMap`, accumulates `ctx.columns`, replaces current `checkSelect` body.
6. **Wire into `athena.ts`** — `checkAthenaAst` creates a root `VisitContext`, runs `visit(ast, ctx, resolutionVisitor)`.
7. **Fix `zzz.spec.ts`** into a real test of the visitor dispatch.

## Key Design Decisions To Resolve

- **One visitor pass or two?** The current code does a single forward pass (resolves tables, then processes columns). A visitor architecture could do two passes (first pass builds the table map, second pass resolves columns), which would simplify handling forward references between CTEs — but is not required yet.
- **Array of tables vs. Map** — the current `allResolvedTables: Record<string, Table[]>` uses arrays to represent ambiguity (multiple matching API endpoints). The new `VisitContext` should preserve this, but consider whether `Map<string, ResolvedTable[]>` is cleaner.
- **Error handling** — `AthenaError` is currently thrown and caught at the top level. With a visitor, errors should either propagate the same way, or be collected in `ctx.errors[]` so all errors in a query are reported at once.

---

## Future Improvements — Supporting More Complex SQL

The following gaps exist in the current implementation. Each item describes what SQL pattern is not yet handled, why it matters, and what work is needed.

### 1. JOIN Resolution

**What fails today:** `JOIN` tables (`isJoin`) are silently skipped in `resolveFromClause`. Any column from a joined table that is not also reachable through a plain `BaseFrom` causes a "can't found column" error or silently produces a wrong result.

**Affected patterns:**

```sql
SELECT req.message, res.message
FROM request_message AS req
JOIN response_message AS res ON json_extract_scalar(res.message, '$.id') = json_extract_scalar(req.message, '$.id')
```

**Work needed:**

- In `resolveFromClause`, handle `isJoin` nodes: the `Join` interface extends `BaseFrom`, so the `table` / `as` fields are available. Register the joined table in `ctx.tables` the same way as a plain `BaseFrom`.
- Add `visitJoin` hook in `visitor.ts`'s resolution path.
- The `ON` clause is an expression and cannot be used to narrow the API match (unlike WHERE). The join condition should be walked for column reference validation only.

### 2. Subquery / Inline View Resolution (`TableExpr`)

**What fails today:** `TableExpr` nodes (subqueries in the FROM clause) are skipped. Columns from subqueries cannot be resolved.

**Affected patterns:**

```sql
SELECT t.url FROM (SELECT url, method FROM link) AS t
```

**Work needed:**

- In `resolveFromClause`, detect `isTableExpr` items and recursively call `checkSelect` on `item.expr.ast`, capturing the resulting columns as a new `ResolvedTable` in `ctx.tables[alias]`.
- The child SELECT needs its own `createChildContext(ctx)` so its own alias map doesn't pollute the outer scope.

### 3. CAST Type Propagation

**What fails today:** `CAST(expr AS type)` is walked but the target type is ignored. The column receives the schema of the inner expression, not the cast type.

**Affected patterns:**

```sql
SELECT CAST(json_extract(responsebody, '$.links') AS ARRAY<VARCHAR>) AS linkages
FROM link CROSS JOIN UNNEST(linkages) AS t(linkage)
-- linkages has schema { type:'object' } instead of { type:'array', items:{ type:'string' } }
```

This means UNNEST pre-pass correctly finds `linkages` is `array` only when the JSON schema already says so, not when it is produced by a CAST. Two tests in `athena.spec.ts` carry a `[TODO:] handle array item type extraction using schema dereferencing` comment on exactly this case.

**Work needed:**

- In `resolveSelectColumns`, detect that `hasFunctionCalls` found a `cast` node.
- Use `extractCastTarget(expr)` (new helper) to get `target.dataType` (e.g. `'ARRAY'`, `'MAP'`, `'VARCHAR'`, `'JSON'`).
- Map Athena/Trino type names to JSON Schema equivalents and substitute the schema before storing the column.
- Extend `ColumnRefWithIndex` or add a new `CastExpr` shape to make the type accessible without `unknown` casts.

### 4. CASE Expression Schema

**What fails today:** A column whose expression is a `case` node has 0 `column_ref` items at the top level (each arm has refs, but the rule counts refs at the outer level). It falls into the "multiple refs → string" bucket even when all arms resolve to the same type.

**Affected patterns:**

```sql
SELECT CASE WHEN method = 'GET' THEN responsebody ELSE requestbody END AS body FROM link
```

**Work needed:**

- Special-case `case` nodes in pass 2: collect refs from each arm's `result`, intersect the resolved schemas, and emit that as the output schema.
- Add `extractCaseArms(expr)` helper in `visitor.ts`.

### 5. OR Conditions in API Matcher

**What fails today:** `api-matcher.ts` extracts path/method conditions only from AND-chains in the WHERE clause. SQL that uses `OR` to express version-specific URL patterns is handled by the rule passing multiple matched operations — but only when the condition can be matched by each alternative independently. A disjunction like `(split(url,'/')[3]='v1' AND ...) OR (split(url,'/')[3]='v2' AND ...)` produces no match for either branch individually, so `matchApi` throws.

**Affected patterns:**

```sql
WHERE method = 'PUT'
AND (
  (split(url, '/')[4] = 'card' AND cardinality(split(url, '/')) = 5)
  OR
  (split(url, '/')[4] = 'card' AND split(url, '/')[6] = 'number' AND cardinality(split(url, '/')) = 6)
)
```

The test case `'AND/OR'` in `athena.spec.ts` is currently in the `invalid` set with a misleading error message — it is expected to be valid, but fails today.

**Work needed:**

- Teach `api-matcher.ts` to recognise OR-of-AND patterns: extract each AND branch as a separate matcher set, union all matched operations across branches.
- Alternatively, fall back to "no path constraint" when an OR is detected at the top level of the WHERE, accepting a potentially larger set of matched operations.

### 6. UNION Column Compatibility Check

**What fails today:** UNION ALL branches are resolved independently; their column count and schemas are never compared. A UNION where one branch has a different column name or an incompatible type silently passes.

**Work needed:**

- After resolving `select._next`, compare the column maps (names and schemas) between the current SELECT and the next SELECT.
- Report `AthenaError` if column counts differ or if a column in the next branch does not exist in the current branch.
- Consider whether schema compatibility checking (e.g. `string` vs `object`) should also be enforced, or just name-level matching.

### 7. Multiple Matched Operations — Conflict Reporting

**What fails today:** When multiple API operations match for the same service table (e.g. two different response status codes, or GET and POST), `buildServiceTables` silently creates multiple `ResolvedTable` entries. Column resolution then collects schemas from all of them. Conflicting schemas (e.g. different response body shapes for 200 vs 204) are silently merged.

**Work needed:**

- After `buildServiceTables`, if `operations.length > 1`, emit a warning (not an error, since it may be intentional) listing the matched operations.
- In `resolveSelectColumns`, when `resolvedColumns.length > 1`, check whether all schemas are identical. If not, either report a warning or fall back to `{ type: 'object' }`.

### 8. Error Collection (All Errors Per Query)

**What fails today:** The first `AthenaError` thrown immediately exits resolution, so only one error per SQL string is reported even if the query has multiple bad property accesses.

**Work needed:**

- Add `errors: AthenaError[]` to `VisitContext`.
- Replace `throw new AthenaError(...)` with `ctx.errors.push(...); continue` in pass 2.
- After `checkAthenaAst` returns, report each collected error as a separate `context.report(...)` call (or a single report with all messages joined).

### 9. Remove `ast.json` Debug Write

**What fails today (non-functional):** `athena.ts` writes `ast.json` to disk on every linted SQL string:

```typescript
fs.writeFileSync('ast.json', JSON.stringify(ast, undefined, 2));
```

This is a development artifact. In production it creates a file in the working directory on every lint run and makes the rule non-deterministic in parallel lint runs.

**Work needed:** Delete the `fs.writeFileSync` call and the `import fs from 'node:fs'` import. If debug AST output is needed, gate it behind `DEBUG=eslint-plugin:athena` using the `log` function already available.

### 10. Error Location in Reports

**What fails today:** The rule reports errors at the template literal node level (the whole `` `...` `` span). `ResolvedColumn.ast` stores the originating column AST node with `loc` information, but this is never used.

**Work needed:**

- The PEG parser already attaches `loc: { start: { line, column, offset }, end: {...} }` to AST nodes (when `includeLocations: true`).
- Map `loc` back to ESLint's `TSESTree.SourceLocation` and use `context.report({ loc: ... })` to pinpoint the exact column expression that failed rather than the whole template literal.
- The helper `getErrorLocation(ast)` previously existed in the old `athena.ts` (removed in the refactor) as a reference implementation.

### 11. `parameters` CTE Pattern — FROM-less SELECT

**What fails today:** CTEs with no FROM clause (e.g. `SELECT '' AS p_from, '' AS p_to`) produce a `Select` with `from: null`. These currently pass through `resolveFromClause` without registering any table, and then `resolveSelectColumns` tries to iterate zero tables. Because the columns are literal strings (0 `column_ref`s), they fall into the "no column references → use string default" branch and pass. However if someone writes `SELECT p_from FROM parameters` in a later CTE, the `parameters` table is looked up and resolved correctly because `checkSelect` registers its output in `ctx.tables` regardless. **This case already works**, but it is worth documenting explicitly and adding a dedicated test case to guard against regressions.

### 12. Quoted Table Names

**What fails today (partially):** Table names enclosed in double quotes (e.g. `FROM "payment-card"`) are parsed by the PEG grammar but the quotes are preserved in the `table` field: `table: '"payment-card"'`. `locateApi` then looks for a service named `"payment-card"` including the quotes, which fails to match the camelCase folder name `paymentCard`.

The test case `'SELECT with FROM - table name with double quotes'` is currently in the valid set, which suggests the quoted-table fallback path (no matching service → no error) is silently accepted. If schemas exist for `payment-card`, the rule would fail to find them.

**Work needed:**

- Strip leading/trailing `"` or `'` from `tableName` before calling `locateApi` in `resolveFromClause`.
- Add a test case that actually has schemas for a quoted-name service and verifies column resolution succeeds.
