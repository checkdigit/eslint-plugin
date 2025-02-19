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
import type { AnySchemaObject } from 'ajv/dist/2020';

import { parse } from '../peggy/athena-peggy';
import type { ApiSchemas } from '../openapi/generate-schema';
import type { AST, BaseFrom, Column, ColumnRefItem, Select, With } from './types';
import { matchApi, type MatchedOperation } from './api-matcher';
import { locateApi } from './api-locator';

const SCHEMA_STRING: AnySchemaObject = {
  type: 'string',
};

const SCHEMA_OBJECT: AnySchemaObject = {
  type: 'object',
};

export const ruleId = 'athena';
const SYNTEXT_ERROR = 'SyntextError';
const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

interface ResolvedColumn {
  ast?: object | undefined;
  name: string;
  schema: v3.SchemaObject;
}

interface Table {
  ast: unknown;
  name: string;
  apiOperation?: MatchedOperation;
  columns: Record<string, ResolvedColumn>;
}

export interface AthenaContext {
  apiSchemas: Record<string, ApiSchemas[]>;
  tables: Record<string, Table>;
}

function getColumn(name: string, schema: v3.SchemaObject, ast?: object): ResolvedColumn {
  return {
    ast,
    name,
    schema,
  };
}

function checkSelect(selectAST: With | Select, context: AthenaContext) {
  log('checking SELECT', selectAST);

  // get all tables in the select statement
  const tableASTs = JSONPath<BaseFrom[]>({ json: selectAST, path: '$.from..[?(@ && @.table)]' });
  log('table ASTs', tableASTs);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const withTableName = (selectAST as With).name?.value; /*?*/
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  let defaultTableReferenceName: string = '';

  for (const tableAST of tableASTs) {
    const tableName = tableAST.table; /*?*/
    defaultTableReferenceName = tableName;
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

    context.tables[tableName] = {
      ast: tableAST,
      name: tableName,
      ...(tableSchemas === undefined ? {} : { apiOperation: tableSchemas }),
      columns: {
        method: getColumn('method', SCHEMA_STRING),
        started: getColumn('started', SCHEMA_STRING),
        ended: getColumn('ended', SCHEMA_STRING),
        url: getColumn('url', SCHEMA_STRING),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        requestbody: getColumn('requestbody', tableSchemas?.request['properties']?.body ?? SCHEMA_OBJECT),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        requestheaders: getColumn('requestheaders', tableSchemas?.request['properties']?.headers ?? SCHEMA_OBJECT),
        responsestatus: getColumn('responsestatus', SCHEMA_STRING),
        responsemessage: getColumn('responsemessage', SCHEMA_STRING),
        responsetype: getColumn('responsetype', SCHEMA_STRING),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        responsebody: getColumn('responsebody', tableSchemas?.response['properties']?.body ?? SCHEMA_OBJECT),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        responseheaders: getColumn('responseheaders', tableSchemas?.response['properties']?.headers ?? SCHEMA_OBJECT),
      },
    };
  }

  const columns: Record<string, ResolvedColumn> = {};
  for (const columnAST of selectAST.columns ?? []) {
    log('checking column', columnAST);

    const columnReferences = JSONPath<ColumnRefItem[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'column_ref' && @.column)]",
    }); /*?*/
    const columnKeys = new Set(
      columnReferences.map((column) => `${column.table ?? '<default>'}/${column.column as string}`),
    ); /*?*/

    const columnAlias = (columnAST as Column).as as string; /*?*/
    if (columnKeys.size > 1) {
      log('multiple table/column references used in column, defaulting it as default type');
      columns[columnAlias] = getColumn(columnAlias, SCHEMA_STRING, columnAST as object);
      continue;
    }

    const [tableReferenceName, columnReferenceName] = columnKeys.values().next().value?.split('/') as [
      string,
      string,
    ]; /*?*/
    const tableReferenceNameToUse =
      tableReferenceName === '<default>' ? defaultTableReferenceName : tableReferenceName; /*?*/
    const resolvedTable = context.tables[tableReferenceNameToUse];
    assert.ok(resolvedTable !== undefined);
    const resolvedColumn = resolvedTable.columns[columnReferenceName]; /*?*/
    assert.ok(resolvedColumn !== undefined);

    const [propertyAccessor] = JSONPath<string[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'function' && @.name && @.name.name && @.name.name[0] && @.name.name[0].value === 'json_extract_scalar')].args.value[1].value",
    }); /*?*/
    if (propertyAccessor === undefined) {
      log('no property accessor found, keep it as default type');
      columns[columnAlias] = getColumn(columnAlias, resolvedColumn.schema, columnAST as object);
      continue;
    }

    const [propertySchema] = JSONPath<AnySchemaObject[]>({
      json: resolvedColumn.schema,
      path: `$.properties.${propertyAccessor}`,
    }); /*?*/
    assert.ok(
      propertySchema !== undefined,
      JSON.stringify(JSONPath({ json: columnAST as object, path: '$..loc' }), undefined, 2),
    );
    columns[columnAlias] = getColumn(columnAlias, propertySchema, columnAST as object);
  }

  log('resolved columns', columns);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (withTableName !== undefined) {
    context.tables[withTableName] = {
      ast: selectAST,
      name: withTableName,
      columns,
    };
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
