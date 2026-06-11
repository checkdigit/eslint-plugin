// athena/api-matcher.ts

import debug from 'debug';
import type { SchemaObject } from 'ajv/dist/2020';

import type { ApiSchemas, OperationSchemas } from '../openapi/generate-schema';
import type { Binary, ColumnRefItem, Function as SqlFunction } from './types';

const log = debug('eslint-plugin:athena:api-matcher');

export interface OperationToMatch {
  path: string;
  method: string;
  operationSchemas: OperationSchemas;
}

export interface MatchedOperation {
  path: string;
  method: string;
  request: SchemaObject;
  response: SchemaObject;
}

// A predicate over an API operation candidate: (url path, HTTP method, HTTP response code)
type OperationPredicate = (path: string, method: string, responseCode: string) => boolean;

const ALWAYS_TRUE: OperationPredicate = () => true;

// --- AST accessor helpers (use Record<string,unknown> to avoid TypeScript narrowing conflicts) ---

function rec(node: unknown): Record<string, unknown> | undefined {
  return typeof node === 'object' && node !== null ? (node as Record<string, unknown>) : undefined;
}

function getFunctionName(node: unknown): string | undefined {
  const fn = rec(node);
  if (fn?.['type'] !== 'function') {
    return undefined;
  }
  const name = fn['name'] as SqlFunction['name'] | undefined;
  const firstName = name?.name[0];
  return firstName === undefined ? undefined : firstName.value.toLowerCase();
}

function getColumnRef(node: unknown): ColumnRefItem | undefined {
  const col = rec(node);
  return col?.['type'] === 'column_ref' ? (node as ColumnRefItem) : undefined;
}

function getColumnName(node: unknown): string | undefined {
  const column = getColumnRef(node)?.column;
  return typeof column === 'string' ? column.toLowerCase() : undefined;
}

function getColumnTable(node: unknown): string | undefined {
  return getColumnRef(node)?.table ?? undefined;
}

function getStringValue(node: unknown): string | undefined {
  const val = rec(node);
  if (val?.['type'] !== 'single_quote_string' && val?.['type'] !== 'string') {
    return undefined;
  }
  return typeof val['value'] === 'string' ? val['value'] : undefined;
}

function getNumberValue(node: unknown): number | undefined {
  const val = rec(node);
  return val?.['type'] === 'number' && typeof val['value'] === 'number' ? val['value'] : undefined;
}

// Returns the function args when the node is split(url, '/') or split_part(url, '/'), else undefined.
function getSplitUrlFunctionArgs(node: unknown, functionName: 'split' | 'split_part'): unknown[] | undefined {
  if (getFunctionName(node) !== functionName) {
    return undefined;
  }
  const args = (rec(node)?.['args'] as { value?: unknown[] } | undefined)?.value;
  if (!Array.isArray(args) || args.length < 2) {
    return undefined;
  }
  if (getColumnName(args[0]) !== 'url' || getStringValue(args[1]) !== '/') {
    return undefined;
  }
  return args;
}

// Matches: split(url, '/')[N]  — a Function node carrying an array_index extension
interface SplitUrlIndexed extends SqlFunction {
  array_index: { brackets: true; index: { type: string; value: unknown } }[];
}
function isSplitUrlIndexed(node: unknown): node is SplitUrlIndexed {
  if (getSplitUrlFunctionArgs(node, 'split') === undefined) {
    return false;
  }
  const fn = rec(node);
  return Array.isArray(fn?.['array_index']) && (fn['array_index'] as unknown[]).length > 0;
}

// Matches: split_part(url, '/', N)  — Presto-style, index in args[2] (1-based)
function isSplitPartUrl(node: unknown): node is SqlFunction {
  const args = getSplitUrlFunctionArgs(node, 'split_part');
  return getNumberValue(args?.[2]) !== undefined;
}

// Matches: cardinality(split(url, '/'))
function isCardinalitySplitUrl(node: unknown): node is SqlFunction {
  if (getFunctionName(node) !== 'cardinality') {
    return false;
  }
  const outerArgs = (rec(node)?.['args'] as { value?: unknown[] } | undefined)?.value;
  if (!Array.isArray(outerArgs) || outerArgs.length === 0) {
    return false;
  }
  return getSplitUrlFunctionArgs(outerArgs[0], 'split') !== undefined;
}

// Returns the table qualifier of the left-hand side of a matchable binary condition.
// undefined means either unqualified (applies to every table) or indeterminate.
function getConditionTableQualifier(left: unknown): string | undefined {
  const colName = getColumnName(left);
  if (colName !== undefined) {
    return getColumnTable(left);
  }

  const splitArgs = getSplitUrlFunctionArgs(left, 'split') ?? getSplitUrlFunctionArgs(left, 'split_part');
  if (splitArgs !== undefined) {
    return getColumnTable(splitArgs[0]);
  }
  if (isCardinalitySplitUrl(left)) {
    const outerArgs = (rec(left)?.['args'] as { value?: unknown[] } | undefined)?.value;
    const splitFn = rec(outerArgs?.[0]);
    const innerArgs = (splitFn?.['args'] as { value?: unknown[] } | undefined)?.value;
    return getColumnTable(innerArgs?.[0]);
  }
  return undefined;
}

// --- Predicate builders ---

// Builds a predicate that checks whether the Nth path segment (1-based) equals a fixed value.
// Path parameters (`:param`) are treated as wildcards and always match.
function buildPathSegmentPredicate(index: number, value: string): OperationPredicate {
  return (path) => {
    const part = path.split('/')[index - 1];
    log('checking path segment', { path, index, part, value });
    return part?.startsWith(':') === true ? true : part === value;
  };
}

// tableAlias: the alias (or undefined if none) of the FROM-clause item we are currently matching.
// Conditions that explicitly reference a different alias are skipped (treated as ALWAYS_TRUE).
function buildLeafPredicate(node: Binary, tableAlias: string | undefined): OperationPredicate | undefined {
  if (node.operator !== '=') {
    return undefined;
  }
  const { left, right } = node;

  const conditionTable = getConditionTableQualifier(left);
  // conditionTable === undefined → unqualified or indeterminate, applies to all tables
  // conditionTable === string   → qualified; skip if it names a different alias
  if (conditionTable !== undefined && tableAlias !== undefined && conditionTable !== tableAlias) {
    return undefined;
  }

  // method = 'GET'
  if (getColumnName(left) === 'method') {
    const value = getStringValue(right);
    if (value !== undefined) {
      return (_path, method) => method === value;
    }
  }

  // responsestatus = '200'
  if (getColumnName(left) === 'responsestatus') {
    const value = getStringValue(right);
    if (value !== undefined) {
      return (_path, _method, responseCode) => responseCode === value;
    }
  }

  // split(url, '/')[N] = 'value'
  if (isSplitUrlIndexed(left)) {
    const index = left.array_index[0]?.index.value;
    const value = getStringValue(right);
    if (typeof index === 'number' && value !== undefined) {
      return buildPathSegmentPredicate(index, value);
    }
  }

  // split_part(url, '/', N) = 'value'
  if (isSplitPartUrl(left)) {
    const index = getNumberValue(getSplitUrlFunctionArgs(left, 'split_part')?.[2]);
    const value = getStringValue(right);
    if (index !== undefined && value !== undefined) {
      return buildPathSegmentPredicate(index, value);
    }
  }

  // cardinality(split(url, '/')) = N
  if (isCardinalitySplitUrl(left)) {
    const count = getNumberValue(right);
    if (count !== undefined) {
      return (path) => path.split('/').length === count;
    }
  }

  return undefined;
}

function buildPredicate(expr: unknown, tableAlias: string | undefined): OperationPredicate {
  const node = rec(expr);
  if (node?.['type'] !== 'binary_expr') {
    return ALWAYS_TRUE;
  }

  const binary = expr as Binary;

  switch (binary.operator) {
    case 'AND': {
      const leftPred = buildPredicate(binary.left, tableAlias);
      const rightPred = buildPredicate(binary.right, tableAlias);
      return (path, method, code) => leftPred(path, method, code) && rightPred(path, method, code);
    }
    case 'OR': {
      const leftPred = buildPredicate(binary.left, tableAlias);
      const rightPred = buildPredicate(binary.right, tableAlias);
      return (path, method, code) => leftPred(path, method, code) || rightPred(path, method, code);
    }
    case 'NOT': {
      const innerPred = buildPredicate(binary.left, tableAlias);
      return (path, method, code) => !innerPred(path, method, code);
    }
    default: {
      return buildLeafPredicate(binary, tableAlias) ?? ALWAYS_TRUE;
    }
  }
}

export function matchApi(
  selectAST: object,
  tableAST: object,
  apiSchemas: ApiSchemas[],
): MatchedOperation[] | undefined {
  const tableAlias = (tableAST as { as?: string | null }).as ?? undefined;
  const predicate = buildPredicate((selectAST as { where?: unknown }).where, tableAlias);

  const allOperations: OperationToMatch[] = apiSchemas
    .flatMap((apiSchema) => Object.entries(apiSchema.apis))
    .flatMap(([path, operations]) =>
      Object.entries(operations).map(([method, operationSchemas]) => ({
        path,
        method: method.toUpperCase(),
        operationSchemas,
      })),
    );
  log('total operation schemas', allOperations.length);

  const matchedApis = allOperations.flatMap(({ path, method, operationSchemas }) =>
    Object.entries(operationSchemas.responses).flatMap(([responseCode, responseSchema]) =>
      predicate(path, method, responseCode)
        ? [{ path, method, request: operationSchemas.request, response: responseSchema }]
        : [],
    ),
  );
  log('matched apis', matchedApis.length);

  if (matchedApis.length === 0) {
    log('no matched api');
    throw new Error(
      'No matched api, please adjust your query conditions to match with at least one API endpoints with firehose enabled.',
    );
  }
  return matchedApis;
}
