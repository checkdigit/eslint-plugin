// athena/athena.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

// import fs from 'node:fs';
import { strict as assert } from 'node:assert';

import debug from 'debug';
import { JSONPath } from 'jsonpath-plus';
import { ESLintUtils } from '@typescript-eslint/utils';
import type { OpenAPIV3_1 as v3 } from 'openapi-types';
import type { SchemaObject } from 'ajv/dist/2020';

import { parse } from '../peggy/athena-peggy';
import type { ApiSchemas } from '../openapi/generate-schema';
import type { AST, BaseFrom, Column, ColumnRefItem, Select, With } from './types';
import { matchApi, type MatchedOperation } from './api-matcher';
import { locateApi } from './api-locator';

const SCHEMA_STRING: SchemaObject = {
  type: 'string',
};

const SCHEMA_OBJECT: SchemaObject = {
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
  name?: string;
  apiOperation?: MatchedOperation[];
  columns: Record<string, ResolvedColumn[]>;
}

export interface AthenaContext {
  apiSchemas: Record<string, ApiSchemas[]>;
  tables: Record<string, Table[]>;
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

// eslint-disable-next-line sonarjs/cognitive-complexity, max-lines-per-function
function checkSelect(selectAST: With | Select, context: AthenaContext, withTableName?: string) {
  log('checking SELECT', selectAST);

  // get all tables in the select statement
  const tableASTs = JSONPath<BaseFrom[]>({ json: selectAST, path: '$.from..[?(@ && @.table && !@.column)]' });
  log('table ASTs', tableASTs);
  const allTableNames = tableASTs.map((tableAST) => tableAST.table); /*?*/

  const tableAliases: Record<string, string> = {};

  const allResolvedTables: Record<string, Table[]> = {};
  for (const tableAST of tableASTs) {
    const tableName = tableAST.table; /*?*/
    const tableAlias = tableAST.as; /*?*/
    if (tableAlias !== null) {
      tableAliases[tableAlias] = tableName;
    }
    if (context.tables[tableName] !== undefined) {
      log('table already processed', tableName);
      allResolvedTables[tableName] = context.tables[tableName];
      continue;
    }

    // if the table is not processed yet, it has to be an service table
    const serviceName = tableName;
    let apiSchemas = context.apiSchemas[serviceName];
    if (apiSchemas === undefined) {
      log('getting api schema for table', serviceName);
      // assuming that the api schema is the same for all tables with the same name
      apiSchemas = locateApi(serviceName);
      context.apiSchemas[serviceName] = apiSchemas;
    }

    // [TODO:] do we alert if the multiple api endpoints are matched? it could be a valid use case, but also might be sth the sql should narrow down
    const tableSchemas = matchApi(selectAST, tableAST, apiSchemas);
    log('table schemas', tableSchemas);

    allResolvedTables[tableName] =
      tableSchemas?.map((tableSchema) => ({
        ast: tableAST,
        name: tableName,
        apiOperation: tableSchemas,
        columns: {
          method: [getColumn('method', SCHEMA_STRING)],
          started: [getColumn('started', SCHEMA_STRING)],
          ended: [getColumn('ended', SCHEMA_STRING)],
          url: [getColumn('url', SCHEMA_STRING)],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          requestbody: [getColumn('requestbody', tableSchema.request['properties']?.body ?? SCHEMA_OBJECT)],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          requestheaders: [getColumn('requestheaders', tableSchema.request['properties']?.headers ?? SCHEMA_OBJECT)],
          responsestatus: [getColumn('responsestatus', SCHEMA_STRING)],
          responsemessage: [getColumn('responsemessage', SCHEMA_STRING)],
          responsetype: [getColumn('responsetype', SCHEMA_STRING)],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          responsebody: [getColumn('responsebody', tableSchema.response['properties']?.body ?? SCHEMA_OBJECT)],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          responseheaders: [getColumn('responseheaders', tableSchema.response['properties']?.headers ?? SCHEMA_OBJECT)],
        },
      })) ?? [];
  }

  const tableColumns: Record<string, ResolvedColumn[]> = {};

  // extract UNNEST columns
  const unnestColumns = JSONPath<ColumnRefItem[]>({
    json: selectAST,
    path: "$..from[?(@ && @.type === 'unnest')]",
  });
  log('unnest columns', unnestColumns);
  const unnestedColumnsToProcess = new Map<string, string>();
  for (const unnestColumn of unnestColumns) {
    const [fromColumn] = JSONPath<string[]>({
      json: unnestColumn,
      path: '$.expr.column',
    }); /*?*/
    assert.ok(fromColumn !== undefined);
    const [toColumn] = JSONPath<string[]>({
      json: unnestColumn,
      path: '$.as.args.value[0].column',
    }); /*?*/
    assert.ok(toColumn !== undefined);
    unnestedColumnsToProcess.set(fromColumn, toColumn);
  }
  log('unnested columns to process', unnestedColumnsToProcess);

  // handle UNNEST columns prior to selected columns processing
  const unnestedColumnsToProcessPostColumnSelection = new Map<string, string>();
  for (const [fromColumn, toColumn] of unnestedColumnsToProcess.entries()) {
    const unnestedInTable = Object.values(allResolvedTables)
      .flat()
      .find((table) => table.columns[fromColumn] !== undefined); /*?*/
    if (unnestedInTable === undefined) {
      unnestedColumnsToProcessPostColumnSelection.set(fromColumn, toColumn);
      continue;
    }
    const unnestedColumn = unnestedInTable.columns[fromColumn]?.[0]; /*?*/
    const unnestedColumnSchema = unnestedColumn?.schema; /*?*/
    assert.ok(unnestedColumnSchema?.type === 'array');
    const transientUnnestedTableName = `${unnestedInTable.name ?? '<anonymous>'}:<unnested>`;
    allResolvedTables[transientUnnestedTableName] = [
      {
        ast: unnestedInTable.ast,
        name: transientUnnestedTableName,
        apiOperation: unnestedInTable.apiOperation ?? [],
        columns: {
          [toColumn]: [getColumn(toColumn, unnestedColumnSchema.items as SchemaObject, unnestedColumn?.ast)],
        },
      },
    ];
  }

  // handle selected columns
  for (const [index, columnAST] of selectAST.columns?.entries() ?? []) {
    log('checking column', columnAST);
    const columnAlias = (columnAST as Column).as as null | string; /*?*/
    const indexedColumnName = `_col${String(index)}`;

    const columnReferences = JSONPath<ColumnRefItem[]>({
      json: columnAST as object /*?*/,
      path: "$..[?(@ && @.type === 'column_ref' && @.column)]",
    }); /*?*/

    if (columnReferences.length !== 1) {
      const columnNameToUse = columnAlias ?? indexedColumnName; /*?*/
      if (columnReferences.length === 0) {
        log('no column references found, keep it as default type');
      } else if (columnReferences.length > 1) {
        log('multiple table/column references used in column, defaulting it as default type');
      }
      tableColumns[columnNameToUse] = [getColumn(columnNameToUse, SCHEMA_STRING, columnAST as object)];
      continue;
    }

    const columnReference = columnReferences[0]; /*?*/
    assert.ok(columnReference !== undefined);

    const tableReferenceName = columnReference.table ?? undefined;
    const columnReferenceName = columnReference.column as string; /*?*/

    const referencedTables =
      tableReferenceName !== undefined
        ? (allResolvedTables[tableAliases[tableReferenceName] ?? tableReferenceName] ?? [])
        : Object.values(allResolvedTables).flat(); //.filter((table): table is Table => table !== undefined); /*?*/ // why do we need this filter? shouldn't it be filtered earlier?
    // [TODO:] handle repeated tables
    log('referenced tables', referencedTables);
    assert.ok(referencedTables.length > 0);

    if (columnReferenceName === '*') {
      log('column reference is *, so adding all columns from table');
      for (const table of referencedTables) {
        // [TODO:] if multiple endpoints match with the same service table, we need to report conflict
        for (const [columnName, columns] of Object.entries(table.columns)) {
          tableColumns[columnName] = columns;
        }
      }
      continue;
    }

    const functionsUsedInColumn = JSONPath<object[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'function')]",
    }); /*?*/
    const columnNameToUse =
      columnAlias ?? (functionsUsedInColumn.length === 0 ? columnReferenceName : indexedColumnName); /*?*/
    log('column name to use', columnNameToUse);

    const resolvedColumns = referencedTables
      .flatMap((table) => {
        log('resolving column', columnReferenceName, table);
        return table.columns[columnReferenceName]; /*?*/
      })
      .filter((column): column is ResolvedColumn => column !== undefined); /*?*/
    if (resolvedColumns.length === 0) {
      throw new AthenaError(
        ATHENA_ERROR,
        `can't found column ${columnReferenceName} in tables: ${allTableNames.toString()}`,
      );
    } else if (resolvedColumns.length > 1) {
      // [TODO:] maybe we should allow this, for now we just delay it until property access happens
      // throw new AthenaError(ATHENA_ERROR, `column exists in multiple referenced tables ${allTableNames.toString()}`);
    }

    const [propertyAccessor] = JSONPath<string[]>({
      json: columnAST as object,
      path: "$..[?(@ && @.type === 'function' && @.name && @.name.name && @.name.name[0] && (@.name.name[0].value === 'json_extract_scalar' || @.name.name[0].value === 'json_extract') )].args.value[1].value",
    }); /*?*/
    if (propertyAccessor === undefined) {
      log('no property accessor found, keep it as default type');
      tableColumns[columnNameToUse] = resolvedColumns.map((column) =>
        getColumn(columnNameToUse, column.schema, columnAST as object),
      );
      continue;
    }

    log('property accessor', propertyAccessor);
    // [TODO:] note that double-dot is used to access properties in case additional layer of schema definition syntax is used in between, e.g. allOf, etc.
    // eslint-disable-next-line prefer-named-capture-group
    const adjustedPropertyAccessor = `$.${propertyAccessor.substring(1).replace(/(\.|\[)/gu, '..properties$1')}`;
    log('adjusted property accessor', adjustedPropertyAccessor);

    log('resolved columns', resolvedColumns);
    const extractedSchemas = resolvedColumns
      .flatMap((column) =>
        JSONPath<SchemaObject[]>({
          json: column.schema,
          path: adjustedPropertyAccessor,
        }),
      )
      .filter(Boolean); /*?*/
    if (extractedSchemas.length === 0) {
      throw new AthenaError(ATHENA_ERROR, `property not found ${columnReferenceName} - ${propertyAccessor}`);
    }
    // [TODO:] handle potential conflicting schemas
    // if (new Set(extractedSchemas.map((schema) => JSON.stringify(schema))).size > 1) {
    //   throw new AthenaError(
    //     ATHENA_ERROR,
    //     `conflicting property schemas found ${columnReferenceName} - ${propertyAccessor} : ${extractedSchemas.map((schema) => JSON.stringify(schema)).join(', ')}`,
    //   );
    // }
    tableColumns[columnNameToUse] = extractedSchemas.map((extracedSchema) =>
      getColumn(columnNameToUse, extracedSchema, columnAST as object),
    );
  }

  // handle UNNEST columns post selected columns processing
  for (const [fromColumn, toColumn] of unnestedColumnsToProcessPostColumnSelection.entries()) {
    const unnestedColumn = tableColumns[fromColumn]; /*?*/
    assert.ok(unnestedColumn !== undefined, `column ${fromColumn} not found in selected columns`);
    const unnestedColumnSchema = unnestedColumn[0]?.schema; /*?*/
    assert.ok(unnestedColumnSchema?.type === 'array');
    tableColumns[toColumn] = [getColumn(toColumn, unnestedColumnSchema.items as SchemaObject, unnestedColumn[0]?.ast)];
  }

  log('resolved columns', tableColumns);
  log(
    'resolved columns schemas',
    Object.entries(tableColumns).map(([name, columns]) =>
      columns.map((column) => `${name}: ${(column.schema as SchemaObject).$id ?? JSON.stringify(column.schema)}`),
    ),
  );

  // eslint-disable-next-line no-underscore-dangle
  const nextSelect = (selectAST as Select)._next;
  if (nextSelect !== undefined) {
    const resolvedNextSelect = checkSelect(nextSelect, context, withTableName);
    log('next select', resolvedNextSelect);
    // [TODO:] check to make sure that the next select has the same columns as the current select
  }

  const resolvedSelect = {
    ast: selectAST,
    ...(withTableName === undefined ? {} : { name: withTableName }),
    columns: tableColumns,
  };

  if (withTableName !== undefined) {
    context.tables[withTableName] = [resolvedSelect];
  }

  return resolvedSelect;
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
          // fs.writeFileSync('ast.json', JSON.stringify(ast, undefined, 2));
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
