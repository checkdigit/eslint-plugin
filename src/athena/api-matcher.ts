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

function getColumnName(node: unknown): string | undefined {
  const col = rec(node);
  if (col?.['type'] !== 'column_ref') {
    return undefined;
  }
  const column = (node as ColumnRefItem).column;
  return typeof column === 'string' ? column.toLowerCase() : undefined;
}

function getColumnTable(node: unknown): string | null | undefined {
  const col = rec(node);
  if (col?.['type'] !== 'column_ref') {
    return undefined;
  }
  return (node as ColumnRefItem).table;
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

// Matches: split(url, '/')[N]  — a Function node carrying an array_index extension
interface SplitUrlIndexed extends SqlFunction {
  array_index: { brackets: true; index: { type: string; value: unknown } }[];
}
function isSplitUrlIndexed(node: unknown): node is SplitUrlIndexed {
  const fn = rec(node);
  if (fn?.['type'] !== 'function') {
    return false;
  }
  if (getFunctionName(node) !== 'split') {
    return false;
  }
  const args = (fn['args'] as { value?: unknown[] } | undefined)?.value;
  if (!Array.isArray(args) || args.length < 2) {
    return false;
  }
  if (getColumnName(args[0]) !== 'url') {
    return false;
  }
  if (getStringValue(args[1]) !== '/') {
    return false;
  }
  return Array.isArray(fn['array_index']) && (fn['array_index'] as unknown[]).length > 0;
}

// Matches: cardinality(split(url, '/'))
function isCardinalitySplitUrl(node: unknown): node is SqlFunction {
  const fn = rec(node);
  if (fn?.['type'] !== 'function') {
    return false;
  }
  if (getFunctionName(node) !== 'cardinality') {
    return false;
  }
  const outerArgs = (fn['args'] as { value?: unknown[] } | undefined)?.value;
  if (!Array.isArray(outerArgs) || outerArgs.length === 0) {
    return false;
  }
  const innerFn = rec(outerArgs[0]);
  if (innerFn?.['type'] !== 'function') {
    return false;
  }
  if (getFunctionName(outerArgs[0]) !== 'split') {
    return false;
  }
  const innerArgs = (innerFn['args'] as { value?: unknown[] } | undefined)?.value;
  if (!Array.isArray(innerArgs) || innerArgs.length < 2) {
    return false;
  }
  return getColumnName(innerArgs[0]) === 'url' && getStringValue(innerArgs[1]) === '/';
}

// Returns the table qualifier of the left-hand side of a matchable binary condition.
// null means unqualified (applies to every table); undefined means indeterminate.
function getConditionTableQualifier(left: unknown): string | null | undefined {
  const colName = getColumnName(left);
  if (colName !== undefined) {
    return getColumnTable(left);
  }

  if (isSplitUrlIndexed(left)) {
    const args = (rec(left)?.['args'] as { value?: unknown[] } | undefined)?.value;
    return getColumnTable(args?.[0]) ?? null;
  }
  if (isCardinalitySplitUrl(left)) {
    const outerArgs = (rec(left)?.['args'] as { value?: unknown[] } | undefined)?.value;
    const splitFn = rec(outerArgs?.[0]);
    const innerArgs = (splitFn?.['args'] as { value?: unknown[] } | undefined)?.value;
    return getColumnTable(innerArgs?.[0]) ?? null;
  }
  return undefined;
}

// --- Predicate builders ---

// tableAlias: the alias (or null if none) of the FROM-clause item we are currently matching.
// Conditions that explicitly reference a different alias are skipped (treated as ALWAYS_TRUE).
function buildLeafPredicate(node: Binary, tableAlias: string | null): OperationPredicate | undefined {
  if (node.operator !== '=') {
    return undefined;
  }
  const { left, right } = node;

  const conditionTable = getConditionTableQualifier(left);
  // conditionTable === null  → unqualified, applies to all tables
  // conditionTable === string → qualified; skip if it names a different alias
  if (conditionTable !== null && conditionTable !== undefined && tableAlias !== null && conditionTable !== tableAlias) {
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
      return (path) => {
        const parts = path.split('/');
        const part = parts[index - 1]; // athena index is 1-based
        log(`checking path part`, { path, index, part, value });
        return part?.startsWith(':') === true ? true : part === value;
      };
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

function buildPredicate(expr: unknown, tableAlias: string | null): OperationPredicate {
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
  const tableAlias = (tableAST as { as?: string | null }).as ?? null;
  const predicate = buildPredicate((selectAST as { where?: unknown }).where ?? null, tableAlias);

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
    throw new Error('no matched api');
  }
  return matchedApis;
}
