// athena/api-locator.ts

import fs from 'node:fs';

import debug from 'debug';

import type { ApiSchemas } from '../openapi/generate-schema';

const log = debug('eslint-plugin:athena:api-locator');

const SERVICES_ROOT_FOLDER = 'src/services';

function upperCaseFirstCharacter(value: string): string {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

export function locateApi(serviceName: string): ApiSchemas[] {
  log('locating API for service', serviceName);

  const serviceNameParts = serviceName.split('-');
  const camelCaseServiceName = [serviceNameParts[0], ...serviceNameParts.slice(1).map(upperCaseFirstCharacter)].join(
    '',
  );

  const allSchemaFilenames = fs.globSync(`${SERVICES_ROOT_FOLDER}/${camelCaseServiceName}/*/swagger.schema.deref.json`);
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  log(`${allSchemaFilenames.length} versions of API schemas located for service ${serviceName}`, allSchemaFilenames);

  return allSchemaFilenames.map((schemaFilename) => JSON.parse(fs.readFileSync(schemaFilename, 'utf-8')) as ApiSchemas);
}
