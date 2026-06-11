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
  fromClauseItems,
  hasFunctionCalls,
  isBaseFrom,
  isJoin,
  isTableExpr,
  isUnnestFrom,
  isValuesFrom,
  type UnnestFrom,
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
const ANONYMOUS_TABLE = '<anonymous>';
const SUBQUERY_TABLE = '<subquery>';

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
  // Aliases are stored under their alias key in ctx.tables, so direct lookup wins.
  const canonical = ctx.aliases.get(nameOrAlias) ?? nameOrAlias;
  return ctx.tables.get(nameOrAlias) ?? ctx.tables.get(canonical) ?? [];
}

function flattenTables(ctx: VisitContext): ResolvedTable[] {
  return [...ctx.tables.values()].flat();
}

function resolveReferencedTables(
  tableRef: string | undefined,
  allTables: ResolvedTable[],
  ctx: VisitContext,
): ResolvedTable[] {
  return tableRef !== undefined ? lookupTables(tableRef, ctx) : allTables;
}

function resolveColumnRefParts(ref: { table: string | null; column: unknown }): {
  tableRef: string | undefined;
  colRef: string | undefined;
} {
  return {
    tableRef: ref.table ?? undefined,
    colRef: typeof ref.column === 'string' ? ref.column : undefined,
  };
}

// ---------------------------------------------------------------------------
// Pass 1 — Resolve FROM clause: service tables → ctx.tables + ctx.aliases
// ---------------------------------------------------------------------------

function resolveServiceTable(select: Select, item: BaseFrom, ctx: VisitContext, storageKey?: string): void {
  const { table: tableName } = item;
  const key = storageKey ?? tableName;
  try {
    const apiSchemas = getApiSchemas(tableName, ctx);
    if (apiSchemas.length === 0) {
      throw new AthenaError(ATHENA_ERROR, `service not found: "${tableName}" (no swagger schema located)`, item);
    }
    const operations = matchApi(select, item, apiSchemas) ?? [];
    // Always use the canonical table name for ResolvedTable.name so that error messages
    // ("in tables: …") show the service name, not the alias.
    ctx.tables.set(key, buildServiceTables(tableName, operations));
  } catch (error) {
    if (error instanceof AthenaError) {
      throw error;
    }
    throw new AthenaError(ATHENA_ERROR, error instanceof Error ? error.message : String(error), item);
  }
}

// Returns the alias name for a ValuesFrom or a standalone UnnestFrom (UNNEST(fn(...))).
function getFunctionAliasName(as: { name: { name: { value: string }[] } } | undefined): string | undefined {
  return as?.name.name[0]?.value;
}

// Extracts a column alias name from an alias-arg node.  Two cases arise:
//   1. column_ref  (the normal case): { type: 'column_ref', column: 'dates' } → 'dates'
//   2. zero-arg keyword function: SQL type keywords like `date` are parsed as DATE() function
//      calls; recover the column name by lowercasing the function name.
function extractColumnAliasName(arg: unknown): string | undefined {
  const colRef = arg as { column?: unknown };
  if (typeof colRef.column === 'string') {
    return colRef.column;
  }
  const fnNode = arg as { type?: unknown; name?: { name?: { value?: string }[] }; args?: { value?: unknown[] } };
  if (fnNode.type === 'function' && fnNode.args?.value?.length === 0) {
    return fnNode.name?.name?.[0]?.value?.toLowerCase();
  }
  return undefined;
}

// UNNEST whose argument is a function call (e.g. SEQUENCE), not a column reference.
function isStandaloneUnnest(node: unknown): node is UnnestFrom {
  return isUnnestFrom(node) && typeof (node.expr as { column?: unknown }).column !== 'string';
}

function aliasAsSingleton(alias: string | undefined): string[] {
  return alias !== undefined ? [alias] : [];
}

// Returns every name under which this FROM item can be stored in ctx.tables.
// Both the alias key and the canonical table name are returned so that service
// tables (stored under alias) and CTEs (stored under canonical name) both survive
// the prune in restrictToFromClause.
function fromItemTableNames(item: From): string[] {
  if (isBaseFrom(item) || isJoin(item)) {
    return item.as !== null ? [item.as, item.table] : [item.table];
  }
  if (isTableExpr(item)) {
    return [typeof item.as === 'string' ? item.as : SUBQUERY_TABLE];
  }
  if (isValuesFrom(item)) {
    return aliasAsSingleton(getFunctionAliasName(item.as));
  }
  const unknownItem = item as unknown;
  if (isStandaloneUnnest(unknownItem)) {
    return aliasAsSingleton(getFunctionAliasName(unknownItem.as ?? undefined));
  }
  return [];
}

function restrictToFromClause(select: Select, ctx: VisitContext): void {
  const fromNames = new Set(fromClauseItems(select).flatMap(fromItemTableNames));
  for (const name of [...ctx.tables.keys()]) {
    if (!fromNames.has(name)) {
      ctx.tables.delete(name);
    }
  }
}

function tableIsResolved(tableName: string, storageKey: string, ctx: VisitContext): boolean {
  return ctx.tables.has(storageKey) || ctx.tables.has(tableName);
}

function registerAliasedTable(tableAlias: string, columns: Map<string, ResolvedColumn[]>, ctx: VisitContext): void {
  ctx.tables.set(tableAlias, [{ name: tableAlias, columns }]);
}

// Shared resolution logic for BaseFrom and Join items (Join extends BaseFrom).
function resolveTableOrJoinItem(select: Select, item: BaseFrom, ctx: VisitContext): void {
  const { table: tableName, as: alias } = item;
  if (alias !== null) {
    ctx.aliases.set(alias, tableName);
  }
  const storageKey = alias ?? tableName;
  // Skip if already resolved: CTE stored under canonical name, or duplicate alias.
  if (!tableIsResolved(tableName, storageKey, ctx)) {
    resolveServiceTable(select, item, ctx, alias ?? undefined);
  }
}

function resolveFromClause(select: Select, ctx: VisitContext): void {
  for (const item of fromClauseItems(select)) {
    const unknownItem = item as unknown;
    if (isStandaloneUnnest(unknownItem)) {
      // Standalone UNNEST(fn()) — register alias with declared column names (schema unknown).
      const tableAlias = getFunctionAliasName(unknownItem.as ?? undefined);
      if (tableAlias !== undefined) {
        const columns = new Map(
          (unknownItem.as?.args.value ?? []).map((columnRef) => {
            const colName = extractColumnAliasName(columnRef) ?? '';
            return [colName, [resolvedCol(colName, {})]];
          }),
        );
        registerAliasedTable(tableAlias, columns, ctx);
      }
    } else if (isUnnestFrom(unknownItem)) {
      // CROSS JOIN UNNEST with a column ref — handled later by extractUnnestMappings.
    } else if (isValuesFrom(item)) {
      const tableAlias = getFunctionAliasName(item.as);
      if (tableAlias !== undefined) {
        const columns = new Map(
          item.as.args.value.map((columnRef) => [columnRef.column, [resolvedCol(columnRef.column, {})]]),
        );
        registerAliasedTable(tableAlias, columns, ctx);
      }
    } else if (isTableExpr(item)) {
      const alias = typeof item.as === 'string' ? item.as : SUBQUERY_TABLE;
      // eslint-disable-next-line no-use-before-define
      checkSelect(item.expr.ast, ctx, alias);
    } else if (isJoin(item) || isBaseFrom(item)) {
      resolveTableOrJoinItem(select, item, ctx);
    }
  }
}

// ---------------------------------------------------------------------------
// UNNEST handling
// ---------------------------------------------------------------------------

interface UnnestMapping {
  fromColumn: string;
  toColumns: string[];
  tableAlias?: string;
  ast: object;
}

function extractUnnestMappings(select: Select): UnnestMapping[] {
  const mappings: UnnestMapping[] = [];

  for (const item of fromClauseItems(select)) {
    if (!isUnnestFrom(item)) {
      continue;
    }

    const fromColumn =
      typeof (item.expr as { column?: unknown }).column === 'string'
        ? (item.expr as { column: string }).column
        : undefined;
    if (fromColumn === undefined) {
      // Standalone UNNEST (e.g. UNNEST(SEQUENCE(...))) — registered in resolveFromClause.
      continue;
    }

    const aliasArgs = item.as?.args.value ?? [];
    const toColumns: string[] = [];
    for (const col of aliasArgs) {
      const colName = extractColumnAliasName(col);
      if (colName !== undefined) {
        toColumns.push(colName);
      }
    }
    assert.ok(toColumns.length > 0, 'UNNEST alias must have at least one column name');

    const tableAlias = getFunctionAliasName(item.as ?? undefined);
    mappings.push({
      fromColumn,
      toColumns,
      ...(tableAlias !== undefined ? { tableAlias } : {}),
      ast: item.expr,
    });
  }

  return mappings;
}

// Resolves UNNEST source schema into target column entries.
// When hasKnownApiOperation is true, an unrecognised schema type throws; otherwise unknown columns
// are registered with an empty schema (the schema is an estimate for non-API sources).
function buildUnnestColumnMap(
  fromColumn: string,
  toColumns: string[],
  sourceSchema: ResolvedColumn['schema'] | undefined,
  sourceAst: object | undefined,
  ast: object,
  hasKnownApiOperation: boolean,
): Map<string, ResolvedColumn[]> {
  if (sourceSchema?.type === 'array') {
    const [toColumn] = toColumns;
    assert.ok(toColumn !== undefined);
    return new Map([[toColumn, [resolvedCol(toColumn, sourceSchema.items, sourceAst)]]]);
  }
  if (sourceSchema?.type === 'object') {
    const [keyColumn, valueColumn] = toColumns;
    assert.ok(
      keyColumn !== undefined && valueColumn !== undefined,
      `UNNEST of map column '${fromColumn}' requires exactly two alias columns (key, value)`,
    );
    const addlProps = (sourceSchema as SchemaObject)['additionalProperties'] as unknown;
    const valueSchema: SchemaObject =
      typeof addlProps === 'object' && addlProps !== null ? addlProps : { type: 'string' };
    return new Map([
      [keyColumn, [resolvedCol(keyColumn, { type: 'string' }, sourceAst)]],
      [valueColumn, [resolvedCol(valueColumn, valueSchema, sourceAst)]],
    ]);
  }
  if (!hasKnownApiOperation) {
    return new Map(toColumns.map((toColumn) => [toColumn, [resolvedCol(toColumn, {})]]));
  }
  throw new AthenaError(
    ATHENA_ERROR,
    `UNNEST source column '${fromColumn}' must resolve to an array or map schema`,
    ast,
  );
}

function applyUnnestPre(mappings: UnnestMapping[], ctx: VisitContext): UnnestMapping[] {
  const deferred: UnnestMapping[] = [];

  for (const { fromColumn, toColumns, tableAlias, ast } of mappings) {
    const ownerTable = flattenTables(ctx).find((table) => table.columns.has(fromColumn));

    if (ownerTable === undefined) {
      deferred.push({ fromColumn, toColumns, ...(tableAlias !== undefined ? { tableAlias } : {}), ast });
      continue;
    }

    const sourceColumns = ownerTable.columns.get(fromColumn) ?? [];
    const unnestTableName = `${ownerTable.name ?? ANONYMOUS_TABLE}:<unnested>`;
    const apiOperation = ownerTable.apiOperation !== undefined ? { apiOperation: ownerTable.apiOperation } : {};
    const unnestColumns = buildUnnestColumnMap(
      fromColumn,
      toColumns,
      sourceColumns[0]?.schema,
      sourceColumns[0]?.ast,
      ast,
      ownerTable.apiOperation !== undefined,
    );
    const unnestEntry: ResolvedTable[] = [{ name: unnestTableName, ...apiOperation, columns: unnestColumns }];
    ctx.tables.set(unnestTableName, unnestEntry);
    if (tableAlias !== undefined) {
      ctx.tables.set(tableAlias, unnestEntry);
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
    const unnestColumns = buildUnnestColumnMap(
      fromColumn,
      toColumns,
      sourceColumns[0]?.schema,
      sourceColumns[0]?.ast,
      ast,
      true,
    );
    for (const [key, value] of unnestColumns) {
      columns.set(key, value);
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 2 — Resolve SELECT columns helpers
// ---------------------------------------------------------------------------

function resolveDefaultSchemaColumn(
  columnAlias: string | undefined,
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
  const firstSchema = resolvedColumns[0]?.schema;
  if (!resolvedColumns.every((col) => JSON.stringify(col.schema) === JSON.stringify(firstSchema))) {
    return '';
  }
  if (firstSchema?.type !== 'object' || firstSchema.properties === undefined) {
    return '';
  }
  const propNames = Object.keys(firstSchema.properties);
  return propNames.length > 0 ? `; available properties: ${propNames.join(', ')}` : '';
}

function resolveSchemaAtPath(
  colRef: string,
  propertyAccessor: string,
  resolvedColumns: ResolvedColumn[],
  ast?: object,
): SchemaObject[] {
  // Double-dot handles allOf / anyOf / oneOf wrappers that may appear in the schema.
  const adjustedPath = `$.${propertyAccessor.substring(1).replace(/(?<sep>\.|\[)/gu, '..properties$<sep>')}`;
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

function throwUnknownTableError(tableRef: string | undefined, colRef: string, ctx: VisitContext, ref: object): never {
  throw new AthenaError(
    ATHENA_ERROR,
    `unknown table or alias '${tableRef ?? colRef}'; known tables: ${[...ctx.tables.keys()].join(', ')}`,
    ref,
  );
}

function resolveReferencedTablesOrThrow(
  tableRef: string | undefined,
  colRef: string,
  allTables: ResolvedTable[],
  ctx: VisitContext,
  ref: object,
): ResolvedTable[] {
  const referencedTables = resolveReferencedTables(tableRef, allTables, ctx);
  if (referencedTables.length === 0) {
    throwUnknownTableError(tableRef, colRef, ctx, ref);
  }
  return referencedTables;
}

function lookupColumnOrThrow(colRef: string, ref: object, referencedTables: ResolvedTable[]): ResolvedColumn[] {
  const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);
  if (resolvedColumns.length === 0) {
    const tableNames = [
      ...new Set(referencedTables.map((referenceTable) => referenceTable.name ?? ANONYMOUS_TABLE)),
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
    const { tableRef, colRef } = resolveColumnRefParts(ref);
    if (colRef === undefined || colRef === '*') {
      continue;
    }
    if (tableRef === undefined && selectColumns?.has(colRef) === true) {
      continue;
    }
    const referencedTables = resolveReferencedTablesOrThrow(tableRef, colRef, allTables, ctx, ref);
    lookupColumnOrThrow(colRef, ref, referencedTables);
  }
}

function validateComplexColumnExpression(columnAST: unknown, allTables: ResolvedTable[], ctx: VisitContext): void {
  for (const { ref, path, fnNode } of extractJsonExtractCalls(columnAST)) {
    const { tableRef, colRef } = resolveColumnRefParts(ref);
    if (colRef === undefined) {
      continue;
    }
    const referencedTables = resolveReferencedTables(tableRef, allTables, ctx);
    const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);
    if (resolvedColumns.length > 0) {
      resolveSchemaAtPath(colRef, path, resolvedColumns, fnNode);
    }
  }
}

function resolveSingleColumnRef(
  columnAST: unknown,
  columnAlias: string | undefined,
  indexedName: string,
  ref: NonNullable<ReturnType<typeof extractColumnRefs>[number]>,
  allTables: ResolvedTable[],
  ctx: VisitContext,
  columns: Map<string, ResolvedColumn[]>,
): void {
  const { tableRef, colRef } = resolveColumnRefParts(ref);
  assert.ok(colRef !== undefined, 'column_ref must have a string column name');

  const referencedTables = resolveReferencedTablesOrThrow(tableRef, colRef, allTables, ctx, ref);

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

function applySchemaTypeOverride(
  columnAST: unknown,
  columnAlias: string | undefined,
  indexedName: string,
  columns: Map<string, ResolvedColumn[]>,
  predicate: (expression: unknown) => boolean,
  schemaType: 'array' | 'object',
): void {
  if (!predicate(columnAST)) {
    return;
  }
  const colName = columnAlias ?? indexedName;
  const existing = columns.get(colName);
  if (existing !== undefined && existing[0]?.schema.type !== schemaType) {
    columns.set(
      colName,
      existing.map((col) => resolvedCol(col.name, { type: schemaType }, col.ast)),
    );
  }
}

function validateClauseExpression(
  expression: unknown,
  allTables: ResolvedTable[],
  ctx: VisitContext,
  selectColumns?: Map<string, ResolvedColumn[]>,
): void {
  checkColumnRefsExist(expression, allTables, ctx, selectColumns);
  validateComplexColumnExpression(expression, allTables, ctx);
}

function resolveSelectColumns(select: Select, ctx: VisitContext): Map<string, ResolvedColumn[]> {
  const allTables = flattenTables(ctx);
  const columns = new Map<string, ResolvedColumn[]>();

  for (const [index, columnAST] of select.columns.entries()) {
    log('resolving column', columnAST);

    const columnAlias = (columnAST as { as?: string | null }).as ?? undefined;
    const indexedName = `_col${String(index)}`;
    const columnRefs = extractColumnRefs(columnAST);

    if (columnRefs.length !== 1) {
      validateClauseExpression(columnAST, allTables, ctx);
      resolveDefaultSchemaColumn(columnAlias, indexedName, columnAST, columns);
    } else {
      const [ref] = columnRefs;
      assert.ok(ref !== undefined);
      resolveSingleColumnRef(columnAST, columnAlias, indexedName, ref, allTables, ctx, columns);
    }

    applySchemaTypeOverride(columnAST, columnAlias, indexedName, columns, containsCastToArray, 'array');
    applySchemaTypeOverride(columnAST, columnAlias, indexedName, columns, containsCastToMap, 'object');
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

  const allTables = flattenTables(selectCtx);
  for (const item of fromClauseItems(select)) {
    const onExpr = (item as { on?: unknown }).on;
    if (onExpr !== undefined) {
      validateClauseExpression(onExpr, allTables, selectCtx);
    }
  }
  if (select.where !== null) {
    validateClauseExpression(select.where, allTables, selectCtx);
  }
  if (select.having !== null) {
    validateClauseExpression(select.having, allTables, selectCtx, columns);
  }
  for (const orderItem of select.orderby ?? []) {
    validateClauseExpression(orderItem.expr, allTables, selectCtx, columns);
  }
  if (select.groupby?.columns !== undefined) {
    for (const groupCol of select.groupby.columns) {
      validateClauseExpression(groupCol, allTables, selectCtx, columns);
    }
  }

  if (select._next !== undefined) {
    const nextColumns = checkSelect(select._next, ctx, withTableName);
    if (columns.size !== nextColumns.size) {
      throw new AthenaError(
        ATHENA_ERROR,
        `UNION ALL parts have different number of columns: ${columns.size.toString()} vs ${nextColumns.size.toString()}`,
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
