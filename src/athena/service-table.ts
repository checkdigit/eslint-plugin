// athena/service-table.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/**
 * Builds a ResolvedTable for one matched API operation against an Athena service table.
 * Each Athena service table exposes a fixed set of top-level columns representing the
 * Kinesis stream record fields (method, url, requestbody, responsebody, etc.).
 */

import type { OpenAPIV3_1 as v3 } from 'openapi-types';
import type { SchemaObject } from 'ajv/dist/2020';

import type { MatchedOperation } from './api-matcher';
import type { ResolvedColumn, ResolvedTable } from './context';

const SCHEMA_STRING: SchemaObject = { type: 'string' };
const SCHEMA_OBJECT: SchemaObject = { type: 'object' };

function col(name: string, schema: v3.SchemaObject): ResolvedColumn {
  return { name, schema };
}

function bodySchema(envelope: SchemaObject, field: 'body' | 'headers'): v3.SchemaObject {
  return (envelope as Record<string, Record<string, v3.SchemaObject>>)['properties']?.[field] ?? SCHEMA_OBJECT;
}

/**
 * Create one ResolvedTable per matched API operation.
 * Multiple operations may match (e.g. GET + POST for the same service), so the
 * caller receives an array and stores all of them under the same table name.
 */
export function buildServiceTables(tableName: string, operations: MatchedOperation[]): ResolvedTable[] {
  return operations.map((operation) => ({
    name: tableName,
    apiOperation: [operation],
    columns: new Map<string, ResolvedColumn[]>([
      ['method', [col('method', SCHEMA_STRING)]],
      ['started', [col('started', SCHEMA_STRING)]],
      ['ended', [col('ended', SCHEMA_STRING)]],
      ['url', [col('url', SCHEMA_STRING)]],
      ['requestbody', [col('requestbody', bodySchema(operation.request, 'body'))]],
      ['requestheaders', [col('requestheaders', bodySchema(operation.request, 'headers'))]],
      ['responsestatus', [col('responsestatus', SCHEMA_STRING)]],
      ['responsemessage', [col('responsemessage', SCHEMA_STRING)]],
      ['responsetype', [col('responsetype', SCHEMA_STRING)]],
      ['responsebody', [col('responsebody', bodySchema(operation.response, 'body'))]],
      ['responseheaders', [col('responseheaders', bodySchema(operation.response, 'headers'))]],
      ['partition_date', [col('partition_date', SCHEMA_STRING)]],
    ]),
  }));
}
