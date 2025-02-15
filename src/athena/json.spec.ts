import fs from 'node:fs';
import { describe, it } from '@jest/globals';
import { JSONPath } from 'jsonpath-plus';

describe('json.spec.ts', () => {
  const json = JSON.parse(fs.readFileSync('ast.json', 'utf-8'));
  it('should work', () => {
    // // tables in the select statement
    // JSONPath({ json, path: '$.from[?(@.table)]' }); /*?*/

    // // columns in the select statement
    // JSONPath({ json, path: '$.columns..[?(@ !== null && @.type==="column_ref")]' }); /*?*/

    // // columns in the where conditions
    // JSONPath({ json, path: '$.where..[?(@ !== null && @.type==="column_ref")]' }); /*?*/

    // // METHOD matcher
    // JSONPath({
    //   json,
    //   path: "$.where..[?(@ !== null && @.type === 'binary_expr' && @.operator === '=' && @.left !== null && @.left.type === 'column_ref' && @.left.column === 'method' && @.right.type === 'single_quote_string')]",
    // }); /*?*/

    // // status code matcher
    // JSONPath({
    //   json,
    //   path: "$.where..[?(@ !== null && @.type === 'binary_expr' && @.operator === '=' && @.left !== null && @.left.type === 'column_ref' && @.left.column === 'responsestatus' && @.right.type === 'single_quote_string')]",
    // }); /*?*/

    // URL path matcher
    // JSONPath({
    //   json,
    //   path: "$.where..[?(@ !== null && @.type === 'binary_expr' && @.operator === '=' && @.left.type === 'function' && @.left.name.name[0].value && @.left.name.name[0].value === 'split' && @.left.args.value[0].type === 'column_ref' && @.left.args.value[0].column === 'url' && @.left.args.value[1].type === 'single_quote_string' && @.left.args.value[1].value === '/')]",
    // }); /*?*/

    // URL path matcher - parts count
    JSONPath({
      json,
      path: "$.where..[?(@ !== null && @.type === 'binary_expr' && @.operator === '=' && @.left.type === 'function' && @.left.name.name[0].value && @.left.name.name[0].value === 'cardinality' && @.right.type === 'number' && @.left.args.value[0].type === 'function' && @.left.args.value[0].name.name[0].value === 'split' && @.left.args.value[0].args.value[0].type === 'column_ref' && @.left.args.value[0].args.value[0].column === 'url' && @.left.args.value[0].args.value[1].type === 'single_quote_string' && @.left.args.value[0].args.value[1].value === '/')].right.value",
    }); /*?*/
  });
});
