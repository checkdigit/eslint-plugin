// athena/api-matcher.ts

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';

import type { ApiSchemas, OperationSchemas } from '../openapi/generate-schema';

const log = debug('eslint-plugin:athena:api-matcher');

export interface Operation {
  path: string;
  method: string;
  operationSchemas: OperationSchemas;
}

type Matcher = (path: string, method: string) => boolean;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getVersionMatcher(_selectAST: object, _tableAST: object): Matcher | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPathPartMatcher(_selectAST: object, _tableAST: object): Matcher | undefined {
  // const pathPartCondition = JSONPath({
  //   json,
  //   path: "$.where..[?(@ !== null && @.type === 'binary_expr' && @.operator === '=' && @.left.type === 'function' && @.left.name.name[0].value && @.left.name.name[0].value === 'SPLIT' && @.left.args.value[0].type === 'column_ref' && @.left.args.value[0].column === 'URL' && @.left.args.value[1].type === 'single_quote_string' && @.left.args.value[1].value === '/')]",
  // }); /*?*/

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

// [TODO] responseStatusMatcher: Matcher;

export function matchApi(selectAST: object, tableAST: object, apiSchemas: ApiSchemas[]): Operation[] {
  const schemaMatchers: Matcher[] = [
    getVersionMatcher(selectAST, tableAST),
    getPathMatchers(selectAST, tableAST),
    getMethodMatcher(selectAST, tableAST),
  ]
    .flat()
    .filter<Matcher>((matcher) => matcher !== undefined);

  const allOperationSchemas: Operation[] = apiSchemas
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

  return matchedOperationSchemas;
}
