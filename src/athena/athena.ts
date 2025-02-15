// athena/athena.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import fs from 'node:fs';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import { ESLintUtils } from '@typescript-eslint/utils';
import type { OpenAPIV3_1 as v3 } from 'openapi-types';

import { parse } from '../peggy/athena-peggy';
import { type ApiOperation, type ApiSchemas } from '../openapi/generate-schema';
import { type AST, type BaseFrom, type Select, type With } from './types';
import { matchApi } from './api-matcher';
import { locateApi } from './api-locator';

export const ruleId = 'athena';
const SYNTEXT_ERROR = 'SyntextError';
const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

interface Column {
  ast: unknown;
  name: string;
  schema: v3.SchemaObject;
}

interface Table {
  ast: unknown;
  name: string;
  apiOperation?: ApiOperation;
  columns: Record<string, Column>;
}

export interface AthenaContext {
  apiSchemas: Record<string, ApiSchemas[]>;
  tables: Record<string, Table>;
}

function checkSelect(selectAST: With | Select, context: AthenaContext) {
  log('checking SELECT', selectAST);

  // get all tables in the select statement
  const tableASTs = JSONPath<BaseFrom[]>({ json: selectAST, path: '$.from..[?(@ && @.table)]' });
  log('table ASTs', tableASTs);
  for (const tableAST of tableASTs) {
    const tableName = tableAST.table;
    if (context.tables[tableName] !== undefined) {
      log('table already processed', tableName);
      continue;
    }

    log('processing table', tableName);
    log('getting api schema for table', tableName);
    let apiSchemas = context.apiSchemas[tableName];
    if (apiSchemas === undefined) {
      // assuming that the api schema is the same for all tables with the same name
      apiSchemas = locateApi(tableName);
      context.apiSchemas[tableName] = apiSchemas;
    }

    const tableSchemas = matchApi(selectAST, tableAST, apiSchemas);
    log('table schemas', tableSchemas);

    // for each table
    // - check if the table needs to be associated with an api
    // - if so, get the api schema
    //   - determine version
    //   - determine endpoint
    //   - determine method
    //   - determine response status

    // get all columns in the select statement
    //   - default columns, or
    //   - columns extracted as JSON
    //   - columns accessed as MAP
    //   - others
    //      - columns accessed as ARRAY ??
    //      - "*" columns !
    //      - handle unnest !!

    // context.tables[tableName] = {
    //   ast: tableAst,
    //   name: tableName,

    //   columns: {},
    // };
  }

}

function checkAthenaAst(ast: AST, context: AthenaContext) {
  assert.equal(ast.type, 'select');
  log('ast', ast);

  if (ast.with !== null) {
    for (const withItem of ast.with) {
      checkSelect(withItem, context);
    }
    ast.with = null;
  }

  checkSelect(ast, context);
}

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `enum` in TypeScript',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TemplateLiteral(sqlNode) {
        const sql = sqlNode.quasis[0]?.value.raw?.trim();
        if (sql === undefined || (!/^SELECT\s+/iu.test(sql) && !/^WITH\s+/iu.test(sql))) {
          return;
        }

        let ast: AST;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ({ ast } = parse(sql, { includeLocations: true }));
          fs.writeFileSync('ast.json', JSON.stringify(ast, undefined, 2));
        } catch (error) {
          context.report({
            node: sqlNode,
            messageId: SYNTEXT_ERROR,
            data: {
              errorMessage: JSON.stringify(error, undefined, 2),
            },
          });
          return;
        }

        const athenaContext: AthenaContext = {
          apiSchemas: {},
          tables: {},
          // tableAliases: {}
        };
        checkAthenaAst(ast, athenaContext);
      },
    };
  },
});

export default rule;
