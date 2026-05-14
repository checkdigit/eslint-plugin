import type { OpenAPIV3_1 as v3 } from 'openapi-types';

export interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestBody?: v3.SchemaObject;
  responses: Record<string, v3.SchemaObject>;
}

// A service may expose multiple endpoints (e.g. /sample/v1, /sample/v2).
export type Service = Record<string, ServiceEndpoint>;
