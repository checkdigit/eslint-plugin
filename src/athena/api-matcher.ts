// athena/api-matcher.ts

import { strict as assert } from 'node:assert';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import type { AnySchemaObject } from 'ajv/dist/2020';

import type { ApiSchemas, OperationSchemas } from '../openapi/generate-schema';

const log = debug('eslint-plugin:athena:api-matcher');

export interface OperationToMatch {
  path: string;
  method: string;
  operationSchemas: OperationSchemas;
}

export interface MatchedOperation {
  path: string;
  method: string;
  request: AnySchemaObject;
  response: AnySchemaObject;
}

type Matcher = (path: string, method: string) => boolean;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getVersionMatcher(_selectAST: object, _tableAST: object): Matcher | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPathPartMatcher(selectAST: object, _tableAST: object): Matcher | undefined {
  const [pathPartCondition]: object[] = JSONPath({
    json: selectAST,
    path: "$.where..[?(@ && @.type === 'binary_expr' && @.operator === '=' && @.left && @.left.type === 'function' && @.left.name && @.left.name.name && @.left.name.name[0] && @.left.name.name[0].value === 'split' && @.left.args && @.left.args.value && @.left.args.value[0] && @.left.args.value[0].type === 'column_ref' && @.left.args.value[0].column === 'url' && @.left.args.value[1] && @.left.args.value[1].type === 'single_quote_string' && @.left.args.value[1].value === '/' && @.left.array_index && @.left.array_index[0] && @.left.array_index[0].brackets === true && @.left.array_index[0].index && @.left.array_index[0].index.type === 'number')]",
  }); /*?*/
  log('pathPartCondition', pathPartCondition);

  if (pathPartCondition !== undefined) {
    const [pathPartIndex]: [number] = JSONPath({
      json: pathPartCondition,
      path: '$.left.array_index[0].index.value',
    }); /*?*/
    const [pathPartMatch]: [string] = JSONPath({
      json: pathPartCondition,
      path: '$.right.value',
    }); /*?*/
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (path: string, _method: string) => {
      const parts = path.split('/'); /*?*/
      const part = parts[pathPartIndex]; /*?*/
      return part?.startsWith(':') === true
        ? true // ignore path part if it presents a dynamic input parameter
        : parts[pathPartIndex - 1] === pathPartMatch; // try to match with static path part
    };
  }

  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPathPartsCountMatcher(selectAST: object, _tableAST: object): Matcher | undefined {
  log('getPathPartsCountMatcher', JSON.stringify(selectAST, undefined, 2));
  const [pathPartCount]: number[] = JSONPath({
    json: selectAST,
    path: "$.where..[?(@ && @.type === 'binary_expr' && @.operator === '=' &&  @.left && @.left.type === 'function' && @.left.name && @.left.name.name && @.left.name.name[0] && @.left.name.name[0].value === 'cardinality' && @.right && @.right.type === 'number' && @.left.args && @.left.args.value && @.left.args.value[0] && @.left.args.value[0].type === 'function' && @.left.args.value[0].name && @.left.args.value[0].name.name && @.left.args.value[0].name.name[0] && @.left.args.value[0].name.name[0].value === 'split' && @.left.args.value[0].args && @.left.args.value[0].args.value && @.left.args.value[0].args.value[0] && @.left.args.value[0].args.value[0].type === 'column_ref' && @.left.args.value[0].args.value[0].column === 'url' && @.left.args.value[0].args.value[1] && @.left.args.value[0].args.value[1].type === 'single_quote_string' && @.left.args.value[0].args.value[1].value === '/')].right.value",
  }); /*?*/

  if (pathPartCount !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (path: string, _method: string) => {
      const parts = path.split('/');
      return parts.length === pathPartCount;
    };
  }

  return undefined;
}

function getPathMatchers(selectAST: object, tableAST: object) {
  return [getPathPartMatcher(selectAST, tableAST), getPathPartsCountMatcher(selectAST, tableAST)];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getMethodMatcher(selectAST: object, _tableAST: object): Matcher | undefined {
  const [methodToMatch]: string[] = JSONPath({
    json: selectAST,
    path: "$.where..[?(@ && @.type === 'binary_expr' && @.operator === '=' && @.left && @.left.type === 'column_ref' && @.left.column === 'method' && @.right && @.right.type === 'single_quote_string')].right.value",
  }); /*?*/

  if (methodToMatch !== undefined) {
    return (_path: string, method: string) => method === methodToMatch;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getResponseStatusToMatch(selectAST: object, _tableAST: object): string | undefined {
  const [responseStatus]: string[] = JSONPath({
    json: selectAST,
    path: "$.where..[?(@ && @.type === 'binary_expr' && @.operator === '=' && @.left && @.left.type === 'column_ref' && @.left.column === 'responsestatus' && @.right && @.right.type === 'single_quote_string')].right.value",
  }); /*?*/

  return responseStatus;
}

// [TODO:] match only relevent table in case multiple tables are joined
export function matchApi(selectAST: object, tableAST: object, apiSchemas: ApiSchemas[]): MatchedOperation | undefined {
  const schemaMatchers: Matcher[] = [
    getVersionMatcher(selectAST, tableAST),
    getPathMatchers(selectAST, tableAST),
    getMethodMatcher(selectAST, tableAST),
  ]
    .flat()
    .filter<Matcher>((matcher) => matcher !== undefined);

  const allOperationSchemas: OperationToMatch[] = apiSchemas
    .flatMap((apiSchema) => Object.entries(apiSchema.apis))
    .flatMap(([path, operations]) =>
      Object.entries(operations).map(([method, operationSchemas]) => ({
        path,
        method: method.toUpperCase(),
        operationSchemas,
      })),
    );
  log('total operation schemas', allOperationSchemas.length);

  const matchedOperationSchemas = allOperationSchemas.filter(({ path, method }) =>
    schemaMatchers.every((matcher) => matcher(path, method)),
  );
  log('matched operation schemas', matchedOperationSchemas.length);

  if (matchedOperationSchemas.length === 0) {
    log('no matched operation schema');
    throw new Error('no matched operation schema');
  } else if (matchedOperationSchemas.length > 1) {
    log('multiple matched operation schemas');
    return undefined;
  }

  const operation = matchedOperationSchemas[0];
  assert.ok(operation !== undefined);

  const matchedResponseStatus = getResponseStatusToMatch(selectAST, tableAST);
  assert.ok(matchedResponseStatus !== undefined);
  log('matchedResponseStatus', matchedResponseStatus);

  const responseSchema = operation.operationSchemas.responses[matchedResponseStatus];
  assert.ok(responseSchema !== undefined);

  return {
    path: operation.path,
    method: operation.method,
    request: operation.operationSchemas.request,
    response: responseSchema,
  };
}
