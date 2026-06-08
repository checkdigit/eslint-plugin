// athena/validate.ts

/* eslint-disable max-lines */

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import type { SchemaObject } from 'ajv/dist/2020';

import type { AST, BaseFrom, From, Select, With } from './types';
import { matchApi } from './api-matcher.ts';
import { locateApi } from './api-locator.ts';
import { createChildContext, type ResolvedColumn, type ResolvedTable, type VisitContext } from './context.ts';
import { buildServiceTables } from './service-table.ts';
import {
  containsCastToArray,
  containsCastToMap,
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

export const SYNTEXT_ERROR = 'SyntextError';
export const ATHENA_ERROR = 'AthenaError';

export class AthenaError extends Error {
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
export function offsetToLoc(text: string, offset: number): { line: number; column: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split('\n');
  return { line: lines.length, column: lines[lines.length - 1]?.length ?? 0 };
}

const log = debug('eslint-plugin:athena');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvedCol(name: string, schema: SchemaObject, ast?: object): ResolvedColumn {
  return ast !== undefined ? { name, schema, ast } : { name, schema };
}

function getApiSchemas(serviceName: string, ctx: VisitContext) {
  let schemas = ctx.apiSchemas.get(serviceName);
  if (schemas === undefined) {
    schemas = locateApi(serviceName);
    ctx.apiSchemas.set(serviceName, schemas);
  }
  return schemas;
}

function lookupTables(nameOrAlias: string, ctx: VisitContext): ResolvedTable[] {
  const canonical = ctx.aliases.get(nameOrAlias) ?? nameOrAlias;
  return ctx.tables.get(canonical) ?? [];
}

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
      continue;
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
      continue;
    }

    const { table: tableName, as: alias } = item;

    if (alias !== null) {
      ctx.aliases.set(alias, tableName);
    }

    if (ctx.tables.has(tableName)) {
      continue;
    }

    resolveServiceTable(select, item, ctx);
  }
}

// ---------------------------------------------------------------------------
// UNNEST handling
// ---------------------------------------------------------------------------

interface UnnestMapping {
  fromColumn: string;
  toColumns: string[];
  ast: object;
}

function extractUnnestMappings(select: Select): UnnestMapping[] {
  const mappings: UnnestMapping[] = [];

  for (const item of fromClauseItems(select)) {
    if (!isUnnestFrom(item)) {
      continue;
    }

    const fromColumn = typeof item.expr.column === 'string' ? item.expr.column : undefined;
    assert.ok(fromColumn !== undefined, 'UNNEST expr must be a column_ref with a string column name');

    const aliasArgs = item.as?.args.value ?? [];
    const toColumns: string[] = [];
    for (const col of aliasArgs) {
      if (typeof (col as { column?: unknown }).column === 'string') {
        toColumns.push((col as { column: string }).column);
      }
    }
    assert.ok(toColumns.length > 0, 'UNNEST alias must have at least one column name');

    mappings.push({ fromColumn, toColumns, ast: item.expr });
  }

  return mappings;
}

function applyUnnestPre(mappings: UnnestMapping[], ctx: VisitContext): UnnestMapping[] {
  const deferred: UnnestMapping[] = [];

  for (const { fromColumn, toColumns, ast } of mappings) {
    const ownerTable = [...ctx.tables.values()].flat().find((table) => table.columns.has(fromColumn));

    if (ownerTable === undefined) {
      deferred.push({ fromColumn, toColumns, ast });
      continue;
    }

    const sourceColumns = ownerTable.columns.get(fromColumn) ?? [];
    const sourceSchema = sourceColumns[0]?.schema;
    const unnestTableName = `${ownerTable.name ?? '<anonymous>'}:<unnested>`;
    const apiOperation = ownerTable.apiOperation !== undefined ? { apiOperation: ownerTable.apiOperation } : {};

    if (sourceSchema?.type === 'array') {
      const [toColumn] = toColumns;
      assert.ok(toColumn !== undefined);
      ctx.tables.set(unnestTableName, [
        {
          name: unnestTableName,
          ...apiOperation,
          columns: new Map([[toColumn, [resolvedCol(toColumn, sourceSchema.items, sourceColumns[0]?.ast)]]]),
        },
      ]);
    } else if (sourceSchema?.type === 'object') {
      const [keyColumn, valueColumn] = toColumns;
      assert.ok(
        keyColumn !== undefined && valueColumn !== undefined,
        `UNNEST of map column '${fromColumn}' requires exactly two alias columns (key, value)`,
      );
      const addlProps = (sourceSchema as SchemaObject)['additionalProperties'] as unknown;
      const valueSchema: SchemaObject =
        typeof addlProps === 'object' && addlProps !== null ? addlProps : { type: 'string' };
      ctx.tables.set(unnestTableName, [
        {
          name: unnestTableName,
          ...apiOperation,
          columns: new Map([
            [keyColumn, [resolvedCol(keyColumn, { type: 'string' }, sourceColumns[0]?.ast)]],
            [valueColumn, [resolvedCol(valueColumn, valueSchema, sourceColumns[0]?.ast)]],
          ]),
        },
      ]);
    } else {
      throw new AthenaError(
        ATHENA_ERROR,
        `UNNEST source column '${fromColumn}' must resolve to an array or map schema`,
        ast,
      );
    }
  }

  return deferred;
}

function applyUnnestPost(mappings: UnnestMapping[], columns: Map<string, ResolvedColumn[]>): void {
  for (const { fromColumn, toColumns, ast } of mappings) {
    const sourceColumns = columns.get(fromColumn);
    if (sourceColumns === undefined) {
      throw new AthenaError(ATHENA_ERROR, `UNNEST source column '${fromColumn}' not found in SELECT`, ast);
    }
    const sourceSchema = sourceColumns[0]?.schema;

    if (sourceSchema?.type === 'array') {
      const [toColumn] = toColumns;
      assert.ok(toColumn !== undefined);
      columns.set(toColumn, [resolvedCol(toColumn, sourceSchema.items, sourceColumns[0]?.ast)]);
    } else if (sourceSchema?.type === 'object') {
      const [keyColumn, valueColumn] = toColumns;
      assert.ok(
        keyColumn !== undefined && valueColumn !== undefined,
        `UNNEST of map column '${fromColumn}' requires exactly two alias columns (key, value)`,
      );
      const addlProps = (sourceSchema as SchemaObject)['additionalProperties'] as unknown;
      const valueSchema: SchemaObject =
        typeof addlProps === 'object' && addlProps !== null ? addlProps : { type: 'string' };
      columns.set(keyColumn, [resolvedCol(keyColumn, { type: 'string' }, sourceColumns[0]?.ast)]);
      columns.set(valueColumn, [resolvedCol(valueColumn, valueSchema, sourceColumns[0]?.ast)]);
    } else {
      throw new AthenaError(
        ATHENA_ERROR,
        `UNNEST source column '${fromColumn}' must resolve to an array or map schema`,
        ast,
      );
    }
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
      continue;
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
      resolveSchemaAtPath(colRef, path, resolvedColumns, fnNode);
    }
  }
}

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
    } else {
      const [ref] = columnRefs;
      assert.ok(ref !== undefined);
      resolveSingleColumnRef(columnAST, columnAlias, indexedName, ref, allTables, ctx, columns);
    }

    if (containsCastToArray(columnAST)) {
      const colName = columnAlias ?? indexedName;
      const existing = columns.get(colName);
      if (existing !== undefined && existing[0]?.schema.type !== 'array') {
        columns.set(
          colName,
          existing.map((col) => resolvedCol(col.name, { type: 'array' }, col.ast)),
        );
      }
    }

    if (containsCastToMap(columnAST)) {
      const colName = columnAlias ?? indexedName;
      const existing = columns.get(colName);
      if (existing !== undefined && existing[0]?.schema.type !== 'object') {
        columns.set(
          colName,
          existing.map((col) => resolvedCol(col.name, { type: 'object' }, col.ast)),
        );
      }
    }
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
  const select = 'stmt' in selectAST ? selectAST.stmt.ast : selectAST;
  const selectCtx = createChildContext(ctx);

  resolveFromClause(select, selectCtx);
  restrictToFromClause(select, selectCtx);

  const unnestMappings = extractUnnestMappings(select);
  const deferredUnnest = applyUnnestPre(unnestMappings, selectCtx);

  const columns = resolveSelectColumns(select, selectCtx);

  applyUnnestPost(deferredUnnest, columns);

  log('resolved columns', [...columns.keys()]);

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

  if (withTableName !== undefined) {
    const resolvedTable: ResolvedTable = { name: withTableName, columns };
    ctx.tables.set(withTableName, [resolvedTable]);
  }

  return columns;
}

export function checkAthenaAst(ast: AST, ctx: VisitContext): void {
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

/* eslint-enable max-lines */
