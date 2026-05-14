// athena/context.ts

import type { OpenAPIV3_1 as v3 } from 'openapi-types';

import type { ApiSchemas } from '../openapi/generate-schema';
import type { MatchedOperation } from './api-matcher';

export interface ResolvedColumn {
  name: string;
  schema: v3.SchemaObject;
  ast?: object;
}

export interface ResolvedTable {
  name?: string;
  columns: Map<string, ResolvedColumn[]>;
  apiOperation?: MatchedOperation[];
}

export interface VisitContext {
  // Tables available in this scope, keyed by name. Each name maps to an array because
  // multiple API operations can match a single service table (e.g. GET + POST on same path).
  tables: Map<string, ResolvedTable[]>;
  // alias → canonical table name
  aliases: Map<string, string>;
  // API schema disk-read cache, shared across the entire query to avoid re-reading files.
  apiSchemas: Map<string, ApiSchemas[]>;
  parent?: VisitContext;
}

export function createRootContext(): VisitContext {
  return {
    tables: new Map(),
    aliases: new Map(),
    apiSchemas: new Map(),
  };
}

// Creates a child context that inherits CTE tables registered in the parent scope.
export function createChildContext(parent: VisitContext): VisitContext {
  return {
    tables: new Map(parent.tables),
    aliases: new Map(),
    apiSchemas: parent.apiSchemas,
    parent,
  };
}
