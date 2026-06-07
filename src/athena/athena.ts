// athena/athena.ts

/* eslint-disable max-lines */

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SchemaObject } from 'ajv/dist/2020';

import { parse } from '../peggy/athena-peggy.ts';
import type { AST, BaseFrom, From, Select, With } from './types';
import { matchApi } from './api-matcher.ts';
import { locateApi } from './api-locator.ts';
import {
  createChildContext,
  createRootContext,
  type ResolvedColumn,
  type ResolvedTable,
  type VisitContext,
} from './context.ts';
import { buildServiceTables } from './service-table.ts';
import {
  containsLambda,
  extractBracketAccessorPath,
  extractColumnRefs,
  extractJsonExtractCalls,
  extractJsonExtractPath,
  hasFunctionCalls,
  isBaseFrom,
  isJoin,
  isTableExpr,
  isUnnestFrom,
} from './visitor.ts';

export const ruleId = 'athena';

const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

const SYNTEXT_ERROR = 'SyntextError';
const ATHENA_ERROR = 'AthenaError';

class AthenaError extends Error {
  public code: string;
  public ast?: object;
  constructor(code: string, message: string, ast?: object) {
    super(message);
    this.code = code;
    this.name = 'AthenaError';
    if (ast !== undefined) {
      this.ast = ast;
    }
  }
}

// Convert a 0-based character offset in `text` to a 1-based line / 0-based column ESLint location.
function offsetToLoc(text: string, offset: number): { line: number; column: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split('\n');
  return { line: lines.length, column: lines[lines.length - 1]?.length ?? 0 };
}

// Maps a SQL-string offset (as produced by the PEG parser) back to an absolute source offset.
// Each quasi in a TemplateLiteral contributes a segment; template expressions have no SQL width
// but do occupy source characters, so a naïve single-offset approach gives wrong results when
// the error location is in a quasi that follows one or more template expressions.
interface SqlSourceSegment {
  sqlStart: number; // offset in the trimmed SQL where this quasi's content begins
  srcStart: number; // absolute source offset where this quasi's content begins
}

function buildSqlMapping(sqlNode: TSESTree.Node): SqlSourceSegment[] {
  if (sqlNode.type !== AST_NODE_TYPES.TemplateLiteral) {
    // String literals: single segment, content starts one char after the opening quote.
    return [{ sqlStart: 0, srcStart: sqlNode.range[0] + 1 }];
  }
  const rawSql = sqlNode.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
  const trimStart = rawSql.length - rawSql.trimStart().length;
  const segments: SqlSourceSegment[] = [];
  let sqlCursor = 0;
  for (const [index, quasi] of sqlNode.quasis.entries()) {
    const cooked = quasi.value.cooked ?? '';
    const localTrim = index === 0 ? trimStart : 0;
    // quasi.range[0] is the opening backtick (index 0) or the closing } of the preceding expression.
    segments.push({ sqlStart: sqlCursor, srcStart: quasi.range[0] + 1 + localTrim });
    sqlCursor += cooked.length - localTrim;
  }
  return segments;
}

function sqlOffsetToSource(sqlOffset: number, segments: SqlSourceSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index--) {
    const seg = segments[index];
    if (seg !== undefined && sqlOffset >= seg.sqlStart) {
      return seg.srcStart + (sqlOffset - seg.sqlStart);
    }
  }
  return segments[0]?.srcStart ?? 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvedCol(name: string, schema: SchemaObject, ast?: object): ResolvedColumn {
  return ast !== undefined ? { name, schema, ast } : { name, schema };
}

/** Look up (and cache) API schemas for a service table name. */
function getApiSchemas(serviceName: string, ctx: VisitContext) {
  let schemas = ctx.apiSchemas.get(serviceName);
  if (schemas === undefined) {
    schemas = locateApi(serviceName);
    ctx.apiSchemas.set(serviceName, schemas);
  }
  return schemas;
}

/** Resolve a (possibly aliased) table name to the tables registered in ctx. */
function lookupTables(nameOrAlias: string, ctx: VisitContext): ResolvedTable[] {
  const canonical = ctx.aliases.get(nameOrAlias) ?? nameOrAlias;
  return ctx.tables.get(canonical) ?? [];
}

/** Normalize the FROM clause into a flat array. */
function fromClauseItems(select: Select): From[] {
  if (Array.isArray(select.from)) {
    return select.from;
  }
  if (select.from !== null) {
    return [select.from];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Pass 1 — Resolve FROM clause: service tables → ctx.tables + ctx.aliases
// ---------------------------------------------------------------------------

function resolveServiceTable(select: Select, item: BaseFrom, ctx: VisitContext): void {
  const { table: tableName } = item;
  try {
    const apiSchemas = getApiSchemas(tableName, ctx);
    if (apiSchemas.length === 0) {
      throw new AthenaError(ATHENA_ERROR, `service not found: "${tableName}" (no swagger schema located)`, item);
    }
    const operations = matchApi(select, item, apiSchemas) ?? [];
    ctx.tables.set(tableName, buildServiceTables(tableName, operations));
  } catch (error) {
    if (error instanceof AthenaError) {
      throw error;
    }
    throw new AthenaError(ATHENA_ERROR, error instanceof Error ? error.message : String(error), item);
  }
}

/** Remove inherited CTE tables that are not referenced in this SELECT's FROM clause. */
function restrictToFromClause(select: Select, ctx: VisitContext): void {
  const fromNames = new Set<string>();
  for (const item of fromClauseItems(select)) {
    if (isBaseFrom(item) || isJoin(item)) {
      fromNames.add(item.table);
    } else if (isTableExpr(item)) {
      fromNames.add(typeof item.as === 'string' ? item.as : '<subquery>');
    }
  }
  for (const name of [...ctx.tables.keys()]) {
    if (!fromNames.has(name)) {
      ctx.tables.delete(name);
    }
  }
}

function resolveFromClause(select: Select, ctx: VisitContext): void {
  for (const item of fromClauseItems(select)) {
    if (isUnnestFrom(item)) {
      continue; // UNNEST handled separately
    }

    if (isTableExpr(item)) {
      const alias = typeof item.as === 'string' ? item.as : '<subquery>';
      // eslint-disable-next-line no-use-before-define
      checkSelect(item.expr.ast, ctx, alias);
      continue;
    }

    if (isJoin(item)) {
      const { table: tableName, as: alias } = item;
      if (alias !== null) {
        ctx.aliases.set(alias, tableName);
      }
      if (!ctx.tables.has(tableName)) {
        resolveServiceTable(select, item, ctx);
      }
      continue;
    }

    if (!isBaseFrom(item)) {
      continue; // skip subqueries and DUAL
    }

    const { table: tableName, as: alias } = item;

    if (alias !== null) {
      ctx.aliases.set(alias, tableName);
    }

    if (ctx.tables.has(tableName)) {
      continue; // already resolved (CTE or duplicate)
    }

    resolveServiceTable(select, item, ctx);
  }
}

// ---------------------------------------------------------------------------
// UNNEST handling (may run before or after column selection, depending on
// whether the source column is a service-table column or a computed column).
// ---------------------------------------------------------------------------

interface UnnestMapping {
  fromColumn: string;
  toColumn: string;
}

function extractUnnestMappings(select: Select): UnnestMapping[] {
  const mappings: UnnestMapping[] = [];

  for (const item of fromClauseItems(select)) {
    if (!isUnnestFrom(item)) {
      continue;
    }

    const fromColumn = typeof item.expr.column === 'string' ? item.expr.column : undefined;
    assert.ok(fromColumn !== undefined, 'UNNEST expr must be a column_ref with a string column name');

    // The alias is stored as a func_call node: UNNEST(col) AS t(alias)
    const toColumn = item.as?.args.value[0];
    const toColName =
      toColumn !== undefined && typeof (toColumn as { column?: unknown }).column === 'string'
        ? (toColumn as { column: string }).column
        : undefined;
    assert.ok(toColName !== undefined, 'UNNEST alias must be a column_ref with a string column name');

    mappings.push({ fromColumn, toColumn: toColName });
  }

  return mappings;
}

function applyUnnestPre(mappings: UnnestMapping[], ctx: VisitContext): UnnestMapping[] {
  const deferred: UnnestMapping[] = [];

  for (const { fromColumn, toColumn } of mappings) {
    // Find the table that owns the source column
    const ownerTable = [...ctx.tables.values()].flat().find((table) => table.columns.has(fromColumn));

    if (ownerTable === undefined) {
      deferred.push({ fromColumn, toColumn });
      continue;
    }

    const sourceColumns = ownerTable.columns.get(fromColumn) ?? [];
    const sourceSchema = sourceColumns[0]?.schema;
    assert.ok(sourceSchema?.type === 'array', `UNNEST source column '${fromColumn}' must be an array schema`);

    const unnestTableName = `${ownerTable.name ?? '<anonymous>'}:<unnested>`;
    ctx.tables.set(unnestTableName, [
      {
        name: unnestTableName,
        ...(ownerTable.apiOperation !== undefined ? { apiOperation: ownerTable.apiOperation } : {}),
        columns: new Map([[toColumn, [resolvedCol(toColumn, sourceSchema.items, sourceColumns[0]?.ast)]]]),
      },
    ]);
  }

  return deferred;
}

function applyUnnestPost(mappings: UnnestMapping[], columns: Map<string, ResolvedColumn[]>): void {
  for (const { fromColumn, toColumn } of mappings) {
    const sourceColumns = columns.get(fromColumn);
    assert.ok(sourceColumns !== undefined, `column ${fromColumn} not found in selected columns`);
    const sourceSchema = sourceColumns[0]?.schema;
    assert.ok(sourceSchema?.type === 'array', `UNNEST source column '${fromColumn}' must be an array schema`);
    columns.set(toColumn, [resolvedCol(toColumn, sourceSchema.items, sourceColumns[0]?.ast)]);
  }
}

// ---------------------------------------------------------------------------
// Pass 2 — Resolve SELECT columns helpers
// ---------------------------------------------------------------------------

function resolveDefaultSchemaColumn(
  columnAlias: string | null,
  indexedName: string,
  columnAST: unknown,
  columns: Map<string, ResolvedColumn[]>,
): void {
  const name = columnAlias ?? indexedName;
  columns.set(name, [resolvedCol(name, { type: 'string' }, columnAST as object)]);
}

function expandWildcard(referencedTables: ResolvedTable[], columns: Map<string, ResolvedColumn[]>): void {
  for (const table of referencedTables) {
    for (const [colName, cols] of table.columns) {
      columns.set(colName, cols);
    }
  }
}

// If every resolved column shares the same object schema, return a hint listing its top-level
// properties. Returns '' when schemas differ across matched operations or the schema isn't an object.
function schemaPropertyHint(resolvedColumns: ResolvedColumn[]): string {
  if (resolvedColumns.length === 0) {
    return '';
  }
  const first = JSON.stringify(resolvedColumns[0]?.schema);
  if (!resolvedColumns.every((col) => JSON.stringify(col.schema) === first)) {
    return '';
  }
  const schema = resolvedColumns[0]?.schema;
  if (schema?.type !== 'object') {
    return '';
  }
  const properties = schema.properties;
  if (properties === undefined) {
    return '';
  }
  const propNames = Object.keys(properties);
  return propNames.length > 0 ? `; available properties: ${propNames.join(', ')}` : '';
}

function resolveSchemaAtPath(
  colRef: string,
  propertyAccessor: string,
  resolvedColumns: ResolvedColumn[],
  ast?: object,
): SchemaObject[] {
  // Double-dot handles allOf / anyOf / oneOf wrappers that may appear in the schema.
  // eslint-disable-next-line prefer-named-capture-group
  const adjustedPath = `$.${propertyAccessor.substring(1).replace(/(\.|\[)/gu, '..properties$1')}`;
  log('adjusted path', adjustedPath);

  const extractedSchemas = resolvedColumns.flatMap((col) =>
    JSONPath<SchemaObject[]>({ json: col.schema, path: adjustedPath }),
  );
  log('extracted schemas', extractedSchemas);

  if (extractedSchemas.length === 0) {
    throw new AthenaError(
      ATHENA_ERROR,
      `property not found ${colRef} - ${propertyAccessor}${schemaPropertyHint(resolvedColumns)}`,
      ast,
    );
  }
  return extractedSchemas;
}

function navigateSchemaPath(
  colRef: string,
  propertyAccessor: string,
  resolvedColumns: ResolvedColumn[],
  colName: string,
  columnAST: unknown,
  columns: Map<string, ResolvedColumn[]>,
): void {
  // Prefer the inner function/expression node for location: the Column wrapper rarely carries loc.
  const errorAst = (extractJsonExtractCalls(columnAST)[0]?.fnNode ?? columnAST) as object;
  const extractedSchemas = resolveSchemaAtPath(colRef, propertyAccessor, resolvedColumns, errorAst);
  columns.set(
    colName,
    extractedSchemas.map((schema) => resolvedCol(colName, schema, columnAST as object)),
  );
}

// ---------------------------------------------------------------------------
// Pass 2 — Resolve SELECT columns → Map<name, ResolvedColumn[]>
// ---------------------------------------------------------------------------

/** Resolve a column by name against `referencedTables`, throwing if not found. */
function lookupColumnOrThrow(colRef: string, ref: object, referencedTables: ResolvedTable[]): ResolvedColumn[] {
  const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);
  if (resolvedColumns.length === 0) {
    const tableNames = [
      ...new Set(referencedTables.map((referenceTable) => referenceTable.name ?? '<anonymous>')),
    ].join(', ');
    const availableCols = [...new Set(referencedTables.flatMap((table) => [...table.columns.keys()]))].join(', ');
    throw new AthenaError(
      ATHENA_ERROR,
      `can't found column ${colRef} in tables: ${tableNames}; available columns: ${availableCols}`,
      ref,
    );
  }
  return resolvedColumns;
}

/** Check all column_refs in `ast` exist in scope. Skips lambda expressions (lambda params look like column_refs). */
function checkColumnRefsExist(
  ast: unknown,
  allTables: ResolvedTable[],
  ctx: VisitContext,
  selectColumns?: Map<string, ResolvedColumn[]>,
): void {
  if (containsLambda(ast)) {
    return;
  }
  for (const ref of extractColumnRefs(ast)) {
    const colRef = typeof ref.column === 'string' ? ref.column : undefined;
    if (colRef === undefined || colRef === '*') {
      continue;
    }
    const tableRef = ref.table ?? undefined;
    if (tableRef === undefined && selectColumns?.has(colRef) === true) {
      continue; // SELECT alias used in GROUP BY / ORDER BY / HAVING — valid
    }
    const referencedTables = tableRef !== undefined ? lookupTables(tableRef, ctx) : allTables;
    if (referencedTables.length === 0) {
      throw new AthenaError(
        ATHENA_ERROR,
        `unknown table or alias '${tableRef ?? colRef}'; known tables: ${[...ctx.tables.keys()].join(', ')}`,
        ref,
      );
    }
    lookupColumnOrThrow(colRef, ref, referencedTables);
  }
}

/** Validate all json_extract / json_extract_scalar paths in a complex column expression. */
function validateComplexColumnExpression(columnAST: unknown, allTables: ResolvedTable[], ctx: VisitContext): void {
  for (const { ref, path, fnNode } of extractJsonExtractCalls(columnAST)) {
    const tableRef = ref.table ?? undefined;
    const colRef = typeof ref.column === 'string' ? ref.column : undefined;
    if (colRef === undefined) {
      continue;
    }
    const referencedTables = tableRef !== undefined ? lookupTables(tableRef, ctx) : allTables;
    const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);
    if (resolvedColumns.length > 0) {
      resolveSchemaAtPath(colRef, path, resolvedColumns, fnNode); // throws if path not found
    }
  }
}

/** Resolve a column expression that has exactly one column_ref. */
function resolveSingleColumnRef(
  columnAST: unknown,
  columnAlias: string | null,
  indexedName: string,
  ref: NonNullable<ReturnType<typeof extractColumnRefs>[number]>,
  allTables: ResolvedTable[],
  ctx: VisitContext,
  columns: Map<string, ResolvedColumn[]>,
): void {
  const tableRef = ref.table ?? undefined;
  const colRef = typeof ref.column === 'string' ? ref.column : undefined;
  assert.ok(colRef !== undefined, 'column_ref must have a string column name');

  const referencedTables = tableRef !== undefined ? lookupTables(tableRef, ctx) : allTables;
  if (referencedTables.length === 0) {
    const tableNames = [...ctx.tables.keys()].join(', ');
    throw new AthenaError(
      ATHENA_ERROR,
      `unknown table or alias '${tableRef ?? colRef}'; known tables: ${tableNames}`,
      ref,
    );
  }

  if (colRef === '*') {
    expandWildcard(referencedTables, columns);
    return;
  }

  const withFunctions = hasFunctionCalls(columnAST);
  const colName = columnAlias ?? (withFunctions ? indexedName : colRef);
  const resolvedColumns = lookupColumnOrThrow(colRef, ref, referencedTables);

  const propertyAccessor = extractJsonExtractPath(columnAST) ?? extractBracketAccessorPath(columnAST);
  if (propertyAccessor !== undefined) {
    navigateSchemaPath(colRef, propertyAccessor, resolvedColumns, colName, columnAST, columns);
    return;
  }

  columns.set(
    colName,
    resolvedColumns.map((col) => resolvedCol(colName, col.schema, columnAST as object)),
  );
}

function resolveSelectColumns(select: Select, ctx: VisitContext): Map<string, ResolvedColumn[]> {
  const allTables = [...ctx.tables.values()].flat();
  const columns = new Map<string, ResolvedColumn[]>();

  for (const [index, columnAST] of select.columns.entries()) {
    log('resolving column', columnAST);

    const columnAlias = (columnAST as { as?: string | null }).as ?? null;
    const indexedName = `_col${String(index)}`;
    const columnRefs = extractColumnRefs(columnAST);

    if (columnRefs.length !== 1) {
      checkColumnRefsExist(columnAST, allTables, ctx);
      validateComplexColumnExpression(columnAST, allTables, ctx);
      resolveDefaultSchemaColumn(columnAlias, indexedName, columnAST, columns);
      continue;
    }

    const [ref] = columnRefs;
    assert.ok(ref !== undefined);
    resolveSingleColumnRef(columnAST, columnAlias, indexedName, ref, allTables, ctx, columns);
  }

  return columns;
}

// ---------------------------------------------------------------------------
// Top-level SELECT resolution
// ---------------------------------------------------------------------------

function checkSelect(
  selectAST: Select | With,
  ctx: VisitContext,
  withTableName?: string,
): Map<string, ResolvedColumn[]> {
  // Unwrap CTE wrapper (With → Select)
  const select = 'stmt' in selectAST ? selectAST.stmt.ast : selectAST;

  // Each SELECT gets a child context that inherits CTE tables from the parent.
  const selectCtx = createChildContext(ctx);

  // Pass 1: resolve FROM clause → populate selectCtx.tables + selectCtx.aliases
  resolveFromClause(select, selectCtx);
  // Drop inherited CTE tables not referenced in FROM so allTables stays scoped to this SELECT.
  restrictToFromClause(select, selectCtx);

  // UNNEST pre-pass: mappings whose source is a service-table column
  const unnestMappings = extractUnnestMappings(select);
  const deferredUnnest = applyUnnestPre(unnestMappings, selectCtx);

  // Pass 2: resolve SELECT columns
  const columns = resolveSelectColumns(select, selectCtx);

  // UNNEST post-pass: mappings whose source is a computed SELECT column
  applyUnnestPost(deferredUnnest, columns);

  log('resolved columns', [...columns.keys()]);

  // Pass 3: validate column refs and JSON paths in JOIN ON / WHERE / HAVING / GROUP BY / ORDER BY
  const allTables = [...selectCtx.tables.values()].flat();
  for (const item of fromClauseItems(select)) {
    const onExpr = (item as { on?: unknown }).on;
    if (onExpr !== undefined) {
      checkColumnRefsExist(onExpr, allTables, selectCtx);
      validateComplexColumnExpression(onExpr, allTables, selectCtx);
    }
  }
  if (select.where !== null) {
    checkColumnRefsExist(select.where, allTables, selectCtx);
    validateComplexColumnExpression(select.where, allTables, selectCtx);
  }
  if (select.having !== null) {
    checkColumnRefsExist(select.having, allTables, selectCtx, columns);
    validateComplexColumnExpression(select.having, allTables, selectCtx);
  }
  for (const orderItem of select.orderby ?? []) {
    checkColumnRefsExist(orderItem.expr, allTables, selectCtx, columns);
    validateComplexColumnExpression(orderItem.expr, allTables, selectCtx);
  }
  if (select.groupby?.columns !== undefined) {
    for (const groupCol of select.groupby.columns) {
      checkColumnRefsExist(groupCol, allTables, selectCtx, columns);
      validateComplexColumnExpression(groupCol, allTables, selectCtx);
    }
  }

  // UNION ALL — next SELECT in the chain
  if (select._next !== undefined) {
    const nextColumns = checkSelect(select._next, ctx, withTableName);
    const currentNumberOfKeys = columns.size;
    const nextNumberOfKeys = nextColumns.size;
    if (currentNumberOfKeys !== nextNumberOfKeys) {
      throw new AthenaError(
        ATHENA_ERROR,
        `UNION ALL parts have different number of columns: ${currentNumberOfKeys.toString()} vs ${nextNumberOfKeys.toString()}`,
        select._next,
      );
    }
  }

  // Register CTE result so subsequent SELECTs in the same WITH can reference it
  if (withTableName !== undefined) {
    const resolvedTable: ResolvedTable = { name: withTableName, columns };
    ctx.tables.set(withTableName, [resolvedTable]);
  }

  return columns;
}

function checkAthenaAst(ast: AST, ctx: VisitContext): void {
  assert.ok(ast.type === 'select');
  const select = ast;

  if (select.with !== null) {
    for (const withItem of select.with) {
      checkSelect(withItem.stmt.ast, ctx, withItem.name.value);
    }
    select.with = null;
  }

  checkSelect(select, ctx);
}

// ---------------------------------------------------------------------------
// ESLint rule
// ---------------------------------------------------------------------------

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR | typeof ATHENA_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Athena SQL strings against OpenAPI schemas at lint time',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
      [ATHENA_ERROR]: `AthenaError {{ errorMessage }}`,
    },
  },
  defaultOptions: [],
  create(context) {
    function checkSql(sql: string, sqlNode: TSESTree.Node) {
      if (!/^\s*(?:SELECT\b[\s\S]*\bFROM\b|WITH\b[\s\S]*\bSELECT\b[\s\S]*\b)/iu.test(sql)) {
        log('skipping non-SELECT SQL string', { sql });
        return;
      }

      const sqlMapping = buildSqlMapping(sqlNode);
      let ast: AST;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ({ ast } = parse(sql, { includeLocations: true }));
      } catch (error) {
        log('error parsing Athena SQL', { error, sql });
        const pegLoc = (error as { location?: { start: { offset: number }; end: { offset: number } } }).location;
        if (pegLoc !== undefined) {
          const sourceText = context.sourceCode.getText();
          context.report({
            loc: {
              start: offsetToLoc(sourceText, sqlOffsetToSource(pegLoc.start.offset, sqlMapping)),
              end: offsetToLoc(sourceText, sqlOffsetToSource(pegLoc.end.offset, sqlMapping)),
            },
            messageId: SYNTEXT_ERROR,
            data: { errorMessage: (error as Error).message },
          });
        } else {
          context.report({
            node: sqlNode,
            messageId: SYNTEXT_ERROR,
            data: { errorMessage: (error as Error).message },
          });
        }
        return;
      }
      const athenaCtx = createRootContext();
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        checkAthenaAst(Array.isArray(ast) ? ast[0] : ast, athenaCtx);
      } catch (error) {
        log('error checking Athena AST', { error, sql });
        if (error instanceof AthenaError) {
          const astLoc = (error.ast as { loc?: { start: { offset: number }; end: { offset: number } } } | undefined)
            ?.loc;
          if (astLoc !== undefined) {
            const sourceText = context.sourceCode.getText();
            context.report({
              loc: {
                start: offsetToLoc(sourceText, sqlOffsetToSource(astLoc.start.offset, sqlMapping)),
                end: offsetToLoc(sourceText, sqlOffsetToSource(astLoc.end.offset, sqlMapping)),
              },
              messageId: ATHENA_ERROR,
              data: { errorMessage: error.message },
            });
          } else {
            context.report({
              node: sqlNode,
              messageId: ATHENA_ERROR,
              data: { errorMessage: error.message },
            });
          }
        } else {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for "${context.filename}":`, error);
          context.report({
            node: sqlNode,
            messageId: ATHENA_ERROR,
            data: {
              errorMessage: error instanceof Error ? String(error) : JSON.stringify(error, undefined, 2),
            },
          });
        }
      }
    }

    return {
      TemplateLiteral(sqlNode) {
        const sql = sqlNode.quasis
          .map((quasi) => quasi.value.cooked)
          .join('')
          .trim();
        checkSql(sql, sqlNode);
      },
      Literal(sqlNode) {
        if (typeof sqlNode.value !== 'string') {
          return;
        }
        checkSql(sqlNode.value, sqlNode);
      },
    };
  },
});

export default rule;

/* eslint-enable max-lines */
