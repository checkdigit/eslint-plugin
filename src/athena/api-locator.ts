// athena/api-locator.ts

import fs from 'node:fs';

import debug from 'debug';

import type { ApiSchemas } from '../openapi/generate-schema';

const log = debug('eslint-plugin:athena:api-locator');

export function locateApi(serviceName: string): ApiSchemas[] {
  log('locating API for service', serviceName);

  const lintV1Schemas = JSON.parse(fs.readFileSync('src/api/v1/swagger.schema.json', 'utf-8')) as ApiSchemas;

  const apiSchemas = [lintV1Schemas];
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  log(`${apiSchemas.length} versions of API schemas located for service ${serviceName}`);

  return apiSchemas;
}
