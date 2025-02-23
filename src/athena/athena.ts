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
const ATHENA_ERROR = 'AthenaError';
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

class AthenaError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AthenaError';
  }
}

export function getErrorLocation(ast: object): string {
  return JSON.stringify(JSONPath({ json: ast, path: '$..loc' }), undefined, 2);
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function checkSelect(selectAST: With | Select, context: AthenaContext, withTableName?: string) {
  log('checking SELECT', selectAST);

  // get all tables in the select statement
  const tableASTs = JSONPath<BaseFrom[]>({ json: selectAST, path: '$.from..[?(@ && @.table)]' });
  log('table ASTs', tableASTs);
  const allTableNames = tableASTs.map((tableAST) => tableAST.table); /*?*/

  const tableAliases: Record<string, string> = {};

  const allResolvedTables = [];
  for (const tableAST of tableASTs) {
    const tableName = tableAST.table; /*?*/
    const tableAlias = tableAST.as; /*?*/
    if (tableAlias !== null) {
      tableAliases[tableAlias] = tableName;
    }
    if (context.tables[tableName] !== undefined) {
      log('table already processed', tableName);
      allResolvedTables.push(context.tables[tableName]);
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
    allResolvedTables.push(context.tables[tableName]);
  }

  const columns: Record<string, ResolvedColumn> = {};
  for (const [index, columnAST] of selectAST.columns?.entries() ?? []) {
    log('checking column', columnAST);

    const columnReferences = JSONPath<ColumnRefItem[]>({
      json: columnAST as object /*?*/,
      path: "$..[?(@ && @.type === 'column_ref' && @.column)]",
    }); /*?*/

    const columnAlias = (columnAST as Column).as as null | string; /*?*/
    let columnNameToUse = columnAlias ?? `_col${String(index)}`; /*?*/
    log('column name to use', columnNameToUse);

    if (columnReferences.length === 0) {
      log('no column references found, keep it as default type');
      columns[columnNameToUse] = getColumn(columnNameToUse, SCHEMA_STRING, columnAST as object);
      continue;
    }
    const columnKeys = new Set(
      columnReferences.map((column) => `${column.table ?? '<default>'}/${column.column as string}`),
    ); /*?*/

    if (columnKeys.size > 1) {
      log('multiple table/column references used in column, defaulting it as default type');
      columns[columnNameToUse] = getColumn(columnNameToUse, SCHEMA_STRING, columnAST as object);
      continue;
    }

    const [tableReferenceName, columnReferenceName] = columnKeys.values().next().value?.split('/') as [
      string,
      string,
    ]; /*?*/

    const referencedTables =
      tableReferenceName !== '<default>'
        ? [context.tables[tableAliases[tableReferenceName] ?? tableReferenceName]].filter(
            (table): table is Table => table !== undefined,
          )
        : allResolvedTables; /*?*/
    assert.ok(referencedTables.length > 0);

    if (columnReferenceName === '*') {
      log('column reference is *, so adding all columns from table');
      for (const table of referencedTables) {
        for (const [columnName, column] of Object.entries(table.columns)) {
          columns[columnName] = column;
        }
      }
      continue;
    }

    const functionsUsedInColumn = JSONPath<object[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'function')]",
    }); /*?*/
    if (functionsUsedInColumn.length === 0) {
      columnNameToUse = columnReferenceName; /*?*/
    }

    const resolvedColumns = referencedTables.map((table) => table.columns[columnReferenceName]).filter(Boolean); /*?*/
    if (resolvedColumns.length === 0) {
      throw new AthenaError(
        ATHENA_ERROR,
        `can't found column ${columnReferenceName} in tables: ${allTableNames.toString()}`,
      );
    } else if (resolvedColumns.length > 1) {
      throw new AthenaError(ATHENA_ERROR, `column exists in multiple referenced tables ${allTableNames.toString()}`);
    }

    const resolvedColumn = resolvedColumns[0]; /*?*/
    assert.ok(resolvedColumn !== undefined);
    const [propertyAccessor] = JSONPath<string[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'function' && @.name && @.name.name && @.name.name[0] && (@.name.name[0].value === 'json_extract_scalar' || @.name.name[0].value === 'json_extract') )].args.value[1].value",
    }); /*?*/
    if (propertyAccessor === undefined) {
      log('no property accessor found, keep it as default type');
      columns[columnNameToUse] = getColumn(columnNameToUse, resolvedColumn.schema, columnAST as object);
      continue;
    }

    const [propertySchema] = JSONPath<AnySchemaObject[]>({
      json: resolvedColumn.schema,
      path: `$.properties.${propertyAccessor}`,
    }); /*?*/
    if (propertySchema === undefined) {
      throw new AthenaError(ATHENA_ERROR, `property not found ${columnReferenceName} - ${propertyAccessor}`);
    }
    columns[columnNameToUse] = getColumn(columnNameToUse, propertySchema, columnAST as object);
  }

  log('resolved columns', columns);

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
      checkSelect(withItem.stmt.ast, context, withItem.name.value);
    }
    ast.with = null;
  }

  checkSelect(ast, context);
}

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR | typeof ATHENA_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `enum` in TypeScript',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
      [ATHENA_ERROR]: `AthenaError {{ errorMessage }}`,
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
        };
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          checkAthenaAst(Array.isArray(ast) ? ast[0] : ast, athenaContext);
        } catch (error) {
          if (error instanceof AthenaError) {
            context.report({
              node: sqlNode,
              messageId: ATHENA_ERROR,
              data: {
                errorMessage: error.message,
              },
            });
          } else {
            // eslint-disable-next-line no-console
            console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
            context.report({
              node: sqlNode,
              messageId: ATHENA_ERROR,
              data: {
                errorMessage: error instanceof Error ? String(error) : JSON.stringify(error, undefined, 2),
              },
            });
          }
        }
      },
    };
  },
});

export default rule;
