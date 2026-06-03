// athena/athena.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SchemaObject } from 'ajv/dist/2020';

import { parse } from '../peggy/athena-peggy.ts';
import type { AST, From, Select, With } from './types';
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
  extractBracketAccessorPath,
  extractColumnRefs,
  extractJsonExtractCalls,
  extractJsonExtractPath,
  hasFunctionCalls,
  isBaseFrom,
  isJoin,
  isUnnestFrom,
} from './visitor.ts';

export const ruleId = 'athena';

const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

const SYNTEXT_ERROR = 'SyntextError';
const ATHENA_ERROR = 'AthenaError';

class AthenaError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AthenaError';
  }
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

/** Normalise the FROM clause into a flat array. */
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

function resolveFromClause(select: Select, ctx: VisitContext): void {
  for (const item of fromClauseItems(select)) {
    if (isUnnestFrom(item)) {
      continue; // UNNEST handled separately
    }

    if (isJoin(item)) {
      const { table: tableName, as: alias } = item;
      if (alias !== null) {
        ctx.aliases.set(alias, tableName);
      }
      if (!ctx.tables.has(tableName)) {
        const apiSchemas = getApiSchemas(tableName, ctx);
        const operations = matchApi(select, item, apiSchemas) ?? [];
        ctx.tables.set(tableName, buildServiceTables(tableName, operations));
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

    // Service table: locate + match API schemas from disk.
    // matchApi throws when no operation matches, so operations is always defined here.
    const apiSchemas = getApiSchemas(tableName, ctx);
    const operations = matchApi(select, item, apiSchemas) ?? [];
    ctx.tables.set(tableName, buildServiceTables(tableName, operations));
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

function resolveSchemaAtPath(
  colRef: string,
  propertyAccessor: string,
  resolvedColumns: ResolvedColumn[],
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
    throw new AthenaError(ATHENA_ERROR, `property not found ${colRef} - ${propertyAccessor}`);
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
  const extractedSchemas = resolveSchemaAtPath(colRef, propertyAccessor, resolvedColumns);
  columns.set(
    colName,
    extractedSchemas.map((schema) => resolvedCol(colName, schema, columnAST as object)),
  );
}

// ---------------------------------------------------------------------------
// Pass 2 — Resolve SELECT columns → Map<name, ResolvedColumn[]>
// ---------------------------------------------------------------------------

/** Validate all json_extract / json_extract_scalar paths in a complex column expression. */
function validateComplexColumnExpression(columnAST: unknown, allTables: ResolvedTable[], ctx: VisitContext): void {
  for (const { ref, path } of extractJsonExtractCalls(columnAST)) {
    const tableRef = ref.table ?? undefined;
    const colRef = typeof ref.column === 'string' ? ref.column : undefined;
    if (colRef === undefined) {
      continue;
    }
    const referencedTables = tableRef !== undefined ? lookupTables(tableRef, ctx) : allTables;
    const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);
    if (resolvedColumns.length > 0) {
      resolveSchemaAtPath(colRef, path, resolvedColumns); // throws if path not found
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
  assert.ok(referencedTables.length > 0, `no tables found for column reference '${colRef}'`);

  if (colRef === '*') {
    expandWildcard(referencedTables, columns);
    return;
  }

  const withFunctions = hasFunctionCalls(columnAST);
  const colName = columnAlias ?? (withFunctions ? indexedName : colRef);
  const resolvedColumns = referencedTables.flatMap((table) => table.columns.get(colRef) ?? []);

  if (resolvedColumns.length === 0) {
    const tableNames = [...ctx.tables.keys()].join(', ');
    throw new AthenaError(ATHENA_ERROR, `can't found column ${colRef} in tables: ${tableNames}`);
  }

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

function checkSelect(selectAST: Select | With, ctx: VisitContext, withTableName?: string): void {
  // Unwrap CTE wrapper (With → Select)
  const select = 'stmt' in selectAST ? selectAST.stmt.ast : selectAST;

  // Each SELECT gets a child context that inherits CTE tables from the parent.
  const selectCtx = createChildContext(ctx);

  // Pass 1: resolve FROM clause → populate selectCtx.tables + selectCtx.aliases
  resolveFromClause(select, selectCtx);

  // UNNEST pre-pass: mappings whose source is a service-table column
  const unnestMappings = extractUnnestMappings(select);
  const deferredUnnest = applyUnnestPre(unnestMappings, selectCtx);

  // Pass 2: resolve SELECT columns
  const columns = resolveSelectColumns(select, selectCtx);

  // UNNEST post-pass: mappings whose source is a computed SELECT column
  applyUnnestPost(deferredUnnest, columns);

  log('resolved columns', [...columns.keys()]);

  // UNION ALL — next SELECT in the chain
  if (select._next !== undefined) {
    checkSelect(select._next, ctx, withTableName);
  }

  // Register CTE result so subsequent SELECTs in the same WITH can reference it
  if (withTableName !== undefined) {
    const resolvedTable: ResolvedTable = { name: withTableName, columns };
    ctx.tables.set(withTableName, [resolvedTable]);
  }
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
      if (!/^SELECT\s+/iu.test(sql) && !/^WITH\s+/iu.test(sql)) {
        return;
      }

      let ast: AST;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ({ ast } = parse(sql, { includeLocations: true }));
      } catch (error) {
        context.report({
          node: sqlNode,
          messageId: SYNTEXT_ERROR,
          data: { errorMessage: JSON.stringify(error, undefined, 2) },
        });
        return;
      }

      const athenaCtx = createRootContext();
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        checkAthenaAst(Array.isArray(ast) ? ast[0] : ast, athenaCtx);
      } catch (error) {
        if (error instanceof AthenaError) {
          context.report({
            node: sqlNode,
            messageId: ATHENA_ERROR,
            data: { errorMessage: error.message },
          });
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
