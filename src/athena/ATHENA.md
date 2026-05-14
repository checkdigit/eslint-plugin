# Athena Rule — Design & Implementation Reference

## Purpose

The `athena` ESLint rule validates AWS Athena SQL strings embedded in TypeScript source code (as template literals or string literals beginning with `SELECT` or `WITH`) against OpenAPI schemas at lint time. It catches references to non-existent response/request body properties before the query is ever run in production.

---

## Trigger Conditions

The rule is activated on:

- **Template literals** — every `` `...` `` in the file is inspected; the quasis (the static parts between `${...}` interpolations) are joined and trimmed.
- **String literals** — plain `'...'` or `"..."` strings are inspected if the value is a string type.

In both cases the rule is a no-op unless the resulting string starts with `SELECT ` or `WITH ` (case-insensitive).

---

## File Structure

```
src/athena/
  athena.ts         Entry point: ESLint rule, SQL parse, checkAthenaAst
  visitor.ts        VisitorMap interface, walk() dispatcher, type guards, extractors
  context.ts        VisitContext, ResolvedTable, ResolvedColumn, context factories
  service-table.ts  buildServiceTables() — maps MatchedOperation[] → ResolvedTable[]
  api-locator.ts    locateApi() — finds swagger.schema.deref.json on disk
  api-matcher.ts    matchApi() — filters OpenAPI operations by WHERE-clause conditions
  types.ts          TypeScript types for the PEG parser AST (based on node-sql-parser)
  athena.spec.ts    Integration tests via RuleTester
  zzz.spec.ts       Unit tests for walk() and the extractor helpers
  json.spec.ts      Dev scratch tests for JSONPath exploration (all skipped)
  PLAN.md           Architecture planning document
  ATHENA.md         This file
```

---

## End-to-End Data Flow

```
TypeScript source
      │
      │  TemplateLiteral / Literal ESLint visitor
      ▼
  sql: string   (quasis joined, interpolation placeholders stripped)
      │
      │  parse(sql, { includeLocations: true })  ← src/peggy/athena-peggy.ts
      ▼
  AST: Select | With[]...
      │
      │  checkAthenaAst(ast, ctx)
      ▼
  WITH items processed first (each CTE → checkSelect → ctx.tables)
      │
      │  checkSelect(select, ctx)
      ▼
  ┌────────────────────────────────────────────┐
  │ Pass 1 — resolveFromClause                 │
  │   BaseFrom nodes → locateApi + matchApi    │
  │   → buildServiceTables → ctx.tables        │
  │                                            │
  │ UNNEST pre-pass — applyUnnestPre           │
  │   source is a service-table column         │
  │   → synthetic ctx.tables[name:<unnested>]  │
  │                                            │
  │ Pass 2 — resolveSelectColumns              │
  │   for each SELECT column:                  │
  │     extractColumnRefs → find ref           │
  │     → lookup in ctx.tables                 │
  │     → extractJsonExtractPath / bracket     │
  │     → JSONPath into schema                 │
  │                                            │
  │ UNNEST post-pass — applyUnnestPost         │
  │   source is a computed SELECT column       │
  │                                            │
  │ _next (UNION ALL) → recurse checkSelect    │
  │                                            │
  │ register result in ctx.tables[cteTableName]│
  └────────────────────────────────────────────┘
      │
  AthenaError thrown → context.report(AthenaError)
  parse error thrown → context.report(SyntextError)
```

---

## PEG Grammar

The SQL is parsed by `src/peggy/athena.peggy`, a hand-written PEG grammar compiled to `src/peggy/athena-peggy.ts` via `npm run peggy` (`peggy --format es`). The grammar is an extension of the `node-sql-parser` grammar with Athena/Trino-specific syntax (MAP, ARRAY, TRY_CAST, UNNEST, bracket array access, etc.).

The second grammar `src/peggy/athena-chat.peggy` is an experimental rewrite with a cleaner AST format; it is **not** used by the rule.

The compiled parser's `parse(sql, opts)` returns `{ ast: AST | AST[] }`. When the input is a single statement the result is a single `Select` node; when there are multiple (e.g. `;`-separated) it is an array.

---

## AST Node Shapes (relevant subset)

All types are in `src/athena/types.ts`.

| Shape                          | Key fields                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| `Select`                       | `type:'select'`, `with`, `columns`, `from`, `where`, `_next` (UNION chain) |
| `With`                         | `name.value` (CTE name), `stmt.ast` (inner Select)                         |
| `BaseFrom`                     | `table` (string), `as` (alias or null)                                     |
| `Join` extends `BaseFrom`      | `join` (join type string), `on`                                            |
| `TableExpr`                    | `expr.ast` (sub-Select), `as`                                              |
| `UnnestFrom` (not in types.ts) | `type:'unnest'`, `expr` (ColumnRefItem), `as` (func_call alias)            |
| `Column`                       | `type:'expr'`, `expr` (ExpressionValue), `as` (alias)                      |
| `ColumnRefItem`                | `type:'column_ref'`, `table`, `column`, optionally `array_index`           |
| `Function`                     | `type:'function'`, `name.name[0].value` (fn name), `args.value[]`          |
| `Binary`                       | `type:'binary_expr'`, `operator`, `left`, `right`                          |
| `Cast`                         | `type:'cast'`, `expr`, `target.dataType`                                   |
| `Case`                         | `type:'case'`, `args[]` (when/else arms)                                   |

`ColumnRefItem.array_index` is added by the parser for bracket access (`col['key']`); it is not in the TypeScript type definition and is accessed via the `ColumnRefWithIndex` interface in `visitor.ts`.

---

## Visitor Pattern (`visitor.ts`)

### `VisitorMap`

An interface with optional typed hooks, one per AST node kind:

```typescript
interface VisitorMap {
  visitSelect?(node: Select): void;
  visitWith?(node: With): void;
  visitBaseFrom?(node: BaseFrom): void;
  visitJoin?(node: Join): void;
  visitTableExpr?(node: TableExpr): void;
  visitUnnest?(node: UnnestFrom): void;
  visitColumn?(node: Column): void;
  visitColumnRef?(node: ColumnRefItem): void;
  visitFunction?(node: Function): void;
  visitBinary?(node: Binary): void;
  visitAggrFunc?(node: AggrFunc): void;
  visitCast?(node: Cast): void;
  visitCase?(node: Case): void;
  visitExprList?(node: ExprList): void;
  visitValue?(node: ExpressionValue): void;
}
```

### `walk(node, visitor)`

The main entry point. For a `Select` node it:

1. Calls `visitSelect`
2. Walks `with[]` items (calls `visitWith`, recurses into CTE body)
3. Walks `from[]` items via `walkFrom`
4. Walks `columns[]` items via `walkExpr`
5. Walks `where` via `walkExpr`
6. Walks `_next` (UNION) recursively via `walk`

`walkFrom` dispatches to `visitUnnest`, `visitTableExpr` (+ recurses into subquery), `visitJoin`, or `visitBaseFrom` based on type guards.

`walkExpr` handles expression-level nodes: `binary_expr`, `column_ref`, `function`, `aggr_func`, `cast`, `case`, `expr_list`, `expr` (column wrapper), or `visitValue` for literal/value nodes.

### Type Guards

All accept `unknown` input so callers don't need intermediate casts:

| Guard                 | Identifies                                        |
| --------------------- | ------------------------------------------------- |
| `isUnnestFrom(node)`  | `type === 'unnest'`                               |
| `isDual(node)`        | `type === 'dual'`                                 |
| `isTableExpr(node)`   | has `expr.ast` sub-select                         |
| `isJoin(node)`        | has `join` property, is not unnest/dual/tableExpr |
| `isBaseFrom(node)`    | has `table` property, is none of the above        |
| `hasArrayIndex(node)` | `ColumnRefItem` with `array_index[]`              |

### Extractor Helpers

These replace the ad-hoc JSONPath queries that appeared in the original monolith:

| Helper                             | Returns                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `extractColumnRefs(expr)`          | All `ColumnRefItem` nodes in the subtree                      |
| `extractJsonExtractPath(expr)`     | Path arg of first `json_extract_scalar` / `json_extract` call |
| `extractBracketAccessorPath(expr)` | `$["key"]` string from first bracket accessor (`col['key']`)  |
| `hasFunctionCalls(expr)`           | `true` if any `function` or `aggr_func` node is present       |

---

## Resolution Context (`context.ts`)

```typescript
interface VisitContext {
  tables: Map<string, ResolvedTable[]>; // name → one entry per matched API operation
  aliases: Map<string, string>; // alias → canonical table name
  apiSchemas: Map<string, ApiSchemas[]>; // disk-read cache, shared across the whole query
  parent?: VisitContext; // parent scope (currently stored but not queried)
}
```

**`createRootContext()`** — creates an empty context for the top-level query.

**`createChildContext(parent)`** — creates a child context that pre-populates `tables` from the parent (so CTE results defined in the `WITH` clause are visible to subsequent CTEs and the final `SELECT`). The `aliases` map is fresh (each SELECT has its own alias scope). The `apiSchemas` map is shared by reference.

```typescript
interface ResolvedTable {
  name?: string;
  columns: Map<string, ResolvedColumn[]>; // column name → one per matched operation
  apiOperation?: MatchedOperation[];
}

interface ResolvedColumn {
  name: string;
  schema: v3.SchemaObject;
  ast?: object; // originating AST node (for error location, future use)
}
```

---

## Service Table Columns (`service-table.ts`)

Every Athena service table (Kinesis stream) exposes eleven fixed top-level columns:

| Column            | Schema                          |
| ----------------- | ------------------------------- |
| `method`          | `{ type: 'string' }`            |
| `started`         | `{ type: 'string' }`            |
| `ended`           | `{ type: 'string' }`            |
| `url`             | `{ type: 'string' }`            |
| `requestbody`     | OpenAPI request body schema     |
| `requestheaders`  | OpenAPI request headers schema  |
| `responsestatus`  | `{ type: 'string' }`            |
| `responsemessage` | `{ type: 'string' }`            |
| `responsetype`    | `{ type: 'string' }`            |
| `responsebody`    | OpenAPI response body schema    |
| `responseheaders` | OpenAPI response headers schema |

`requestbody` / `requestheaders` come from `operation.request['properties'].body/headers`; `responsebody` / `responseheaders` from `operation.response['properties'].body/headers`. Both fall back to `{ type: 'object' }` if the field is absent.

`buildServiceTables(tableName, operations)` returns one `ResolvedTable` per `MatchedOperation` (multiple operations may match, e.g. GET and POST on the same path).

---

## API Location (`api-locator.ts`)

`locateApi(serviceName)` converts a kebab-case service name (the SQL table name) to camelCase and globs for `src/services/<camelCase>/*/swagger.schema.deref.json`. All matched files are parsed and returned as `ApiSchemas[]`.

The deref'd schema is used (not the raw `swagger.schema.json`) so `$ref` pointers are already inlined.

---

## API Matching (`api-matcher.ts`)

`matchApi(selectAST, tableAST, apiSchemas)` builds a set of `Matcher` functions from WHERE-clause conditions then filters all operations in `apiSchemas` against them.

Current matchers (each is optional — if the WHERE clause doesn't contain the relevant condition, the matcher is skipped):

| Matcher         | Condition pattern in WHERE                                       |
| --------------- | ---------------------------------------------------------------- |
| Method          | `method = 'GET'` / `'POST'` / etc.                               |
| Path part count | `cardinality(split(url, '/')) = N`                               |
| Path part value | `split(url, '/')[N] = 'value'`                                   |
| Response status | `responsestatus = '200'` (applied post-filter on response codes) |

The function throws an `Error` if no operations match (not `AthenaError` — this propagates as an unexpected error through `checkAthenaAst` and is caught as a non-`AthenaError`, reported with the raw message).

---

## Two-Pass Column Resolution

### Pass 1 — `resolveFromClause`

Iterates `select.from[]`. For each `BaseFrom` item:

- Registers the alias (if any) in `ctx.aliases`
- Skips if the table name is already in `ctx.tables` (CTE reference or duplicate in comma-join)
- Otherwise calls `locateApi` + `matchApi` + `buildServiceTables` and stores the result in `ctx.tables`

JOINs (`isJoin`), UNNEST items, subqueries (`isTableExpr`), and DUAL are skipped in pass 1.

### UNNEST Pre-Pass — `applyUnnestPre`

`extractUnnestMappings` extracts `{ fromColumn, toColumn }` pairs from UNNEST items in `from[]`.

`applyUnnestPre` then tries to resolve each mapping immediately: if the `fromColumn` exists in a service table currently in `ctx.tables`, it verifies the schema is `array`, unwraps the `.items` schema, and registers a synthetic transient table `"<ownerTable>:<unnested>"` in `ctx.tables` with a single column `toColumn` holding the item schema.

Any mappings where `fromColumn` is not yet found (because it will be a computed SELECT column) are returned as `deferred`.

### Pass 2 — `resolveSelectColumns`

Iterates `select.columns[]`. For each column:

1. **Count column refs** (`extractColumnRefs`). If 0 or > 1, fall back to `{ type: 'string' }` under the alias or `_colN` name.
2. **Look up the single ref** in `ctx.tables` (using `ctx.aliases` to resolve table qualifiers).
3. **Wildcard (`*`)** — expand all columns from the referenced tables into `columns`.
4. **Resolve the column name** in each candidate table's `columns` map. Throw `AthenaError` if not found.
5. **Check for property access**: first try `extractJsonExtractPath` (json_extract_scalar/json_extract), then `extractBracketAccessorPath` (bracket accessor). If neither, use the resolved schema directly.
6. **Navigate into the JSON schema** using the accessor path. The path is rewritten to use double-dot (`$..`) to handle intermediate `allOf`/`anyOf`/`oneOf` wrappers. Throw `AthenaError` if the path resolves to nothing.

The column name used in the result map is: alias > bare column name (no function) > `_colN` (function present, no alias).

### UNNEST Post-Pass — `applyUnnestPost`

Resolves the deferred UNNEST mappings against the `columns` map built in pass 2. The `fromColumn` is now a computed column; its schema must be `array`.

### UNION ALL

`select._next` chains the next SELECT in a UNION. After resolving the current SELECT, `checkSelect` recurses on `_next` passing the same parent context and the same `withTableName`. The column schemas from UNION branches are not currently compared against each other (this is a known gap — see PLAN.md).

---

## CTE / WITH Handling

`checkAthenaAst` iterates `select.with[]` before calling `checkSelect` on the main query. For each WITH item it calls `checkSelect(withItem.stmt.ast, ctx, withItem.name.value)`. At the end of `checkSelect`, if `withTableName` is set, the resolved columns are registered as a `ResolvedTable` in `ctx.tables` under that name.

`createChildContext(parent)` copies `parent.tables` so each nested CTE can see tables defined by earlier CTEs in the same WITH clause.

After processing all CTEs, `checkAthenaAst` sets `select.with = null` (mutates the AST) to avoid double-processing in the subsequent `checkSelect` call on the outer select.

---

## Property Accessor Schema Navigation

When a column expression contains a JSON path accessor, the path is converted to a JSONPath expression that navigates into the OpenAPI schema:

```
Input:   $.foo.bar
Rewrite: $...properties.foo..properties.bar
```

The double-dot (`..`) at each segment boundary lets JSONPath skip through intermediate `allOf`, `anyOf`, `oneOf`, or `properties` wrappers that OpenAPI schemas commonly use.

`JSONPath({ json: column.schema, path: adjustedPath })` is called against the resolved column's schema. If no values are returned, `AthenaError` is thrown with `property not found <colRef> - <accessor>`.

---

## Error Reporting

Two message IDs are registered on the ESLint rule:

| ID             | Cause                                         |
| -------------- | --------------------------------------------- |
| `SyntextError` | PEG parser threw (SQL syntax error)           |
| `AthenaError`  | `AthenaError` thrown during schema resolution |

Any other `Error` (e.g. thrown by `matchApi`, `locateApi`, `assert.ok`) is caught and reported as `AthenaError` with the error's string representation, plus a `console.error` to stderr. This is a catch-all for unexpected runtime failures.

Errors are thrown at the first failure encountered (not collected). Multiple errors in one query are reported as a single lint diagnostic for the template literal node.

---

## Schema Files

`src/services/<camelCaseServiceName>/<version>/swagger.schema.deref.json`

Generated by:

1. `src/openapi/generate-schema.ts` — reads `swagger.yml` and produces `swagger.schema.json` with typed request/response schemas keyed by `apis[path][method]`
2. `src/openapi/deref-schema.ts` — resolves `$ref` pointers inline to produce `swagger.schema.deref.json`

The `ApiSchemas` type (from `generate-schema.ts`) has shape:

```typescript
{
  apis: Record<string, Record<string, OperationSchemas>>;
  // apis['/path/v1']['GET'] → { request: SchemaObject, responses: { '200': SchemaObject, ... } }
}
```

---

## Debug Logging

Set `DEBUG=eslint-plugin:athena` (or `eslint-plugin:athena:*`) to see verbose resolution logs. Uses the `debug` npm package.

---

## Known Limitations (as of current implementation)

- Only `BaseFrom` tables are resolved in pass 1; `JOIN ... ON`, subqueries (`TableExpr`), and `DUAL` are silently ignored.
- Multiple column refs in one SELECT column fall back to `{ type: 'string' }` without error.
- `CAST` type information is not propagated — a `CAST(col AS ARRAY<VARCHAR>)` is still treated as the underlying column's schema.
- `CASE` expressions always fall back to `{ type: 'string' }`.
- UNION branches are not checked for column-count or type compatibility.
- Multiple matched API operations for the same table produce multiple `ResolvedTable` entries but conflicts are not reported.
- `OR` conditions in WHERE are not used by `api-matcher` for path/method matching — only AND chains are examined.
- `ast.json` is written to disk on every linted SQL string (debug artifact, should be removed for production use).
