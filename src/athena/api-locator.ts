// athena/api-locator.ts

import fs from 'node:fs';

import debug from 'debug';

import { type ApiSchemas, generateSchemasForService } from '../openapi/generate-schema.ts';

const log = debug('eslint-plugin:athena:api-locator');

const SERVICES_ROOT_FOLDER = 'src/services';
const LEGACY_TABLE_SUFFIX = '_logs';

function upperCaseFirstCharacter(value: string): string {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

export function locateApi(originalServiceName: string): ApiSchemas[] {
  log('locating API for service', originalServiceName);

  let serviceName = originalServiceName;
  if (serviceName.endsWith(LEGACY_TABLE_SUFFIX)) {
    log('service table is a legacy table name, looking for API schemas after removing "_logs" suffix', serviceName);
    serviceName = serviceName.slice(0, -LEGACY_TABLE_SUFFIX.length);
  }

  const serviceNameParts = serviceName.split('-');
  const camelCaseServiceName = [serviceNameParts[0], ...serviceNameParts.slice(1).map(upperCaseFirstCharacter)].join(
    '',
  );

  const allSchemaFilenames = fs.globSync(`${SERVICES_ROOT_FOLDER}/${camelCaseServiceName}/*/swagger.schema.deref.json`);
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  log(`${allSchemaFilenames.length} versions of API schemas located for service ${serviceName}`, allSchemaFilenames);

  if (allSchemaFilenames.length > 0) {
    return allSchemaFilenames.map(
      (schemaFilename) => JSON.parse(fs.readFileSync(schemaFilename, 'utf-8')) as ApiSchemas,
    );
  }

  log('no pre-generated schemas found, attempting on-demand generation for service', serviceName);
  const outputDir = `${SERVICES_ROOT_FOLDER}/${camelCaseServiceName}`;
  return generateSchemasForService(serviceName, outputDir).map(({ schema }) => schema);
}
