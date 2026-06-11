// athena/api-locator.ts

import fs from 'node:fs';

import debug from 'debug';

import { type ApiSchemas, generateSchemasForService } from '../openapi/generate-schema.ts';

const log = debug('eslint-plugin:athena:api-locator');

const SERVICES_ROOT_FOLDER = 'src/services';
const LEGACY_TABLE_SUFFIX = '_logs';
// eslint-disable-next-line no-magic-numbers
const SCHEMA_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export function locateApi(originalServiceName: string): ApiSchemas[] {
  log('locating API for service', originalServiceName);

  let serviceName = originalServiceName;
  if (serviceName.endsWith(LEGACY_TABLE_SUFFIX)) {
    log('service table is a legacy table name, looking for API schemas after removing "_logs" suffix', serviceName);
    serviceName = serviceName.slice(0, -LEGACY_TABLE_SUFFIX.length);
  }

  const camelCaseServiceName = serviceName.replace(/-(?<letter>[a-z])/gu, (_, letter: string) => letter.toUpperCase());

  const allSchemaFilenames = fs.globSync(`${SERVICES_ROOT_FOLDER}/${camelCaseServiceName}/*/swagger.schema.deref.json`);
  log(
    `${allSchemaFilenames.length.toString()} versions of API schemas located for service ${serviceName}`,
    allSchemaFilenames,
  );

  const outputDir = `${SERVICES_ROOT_FOLDER}/${camelCaseServiceName}`;

  if (allSchemaFilenames.length > 0) {
    const hasStaleSchema = allSchemaFilenames.some(
      (schemaFilename) => Date.now() - fs.statSync(schemaFilename).mtimeMs > SCHEMA_MAX_AGE_MS,
    );
    if (hasStaleSchema) {
      log('cached schema(s) are stale (older than 1 hour), regenerating for service', serviceName);
      const regenerated = generateSchemasForService(serviceName, outputDir);
      if (regenerated.length > 0) {
        return regenerated.map(({ schema }) => schema);
      }
      log('regeneration failed, falling back to stale cached schemas for service', serviceName);
    }
    return allSchemaFilenames.map(
      (schemaFilename) => JSON.parse(fs.readFileSync(schemaFilename, 'utf-8')) as ApiSchemas,
    );
  }

  log('no pre-generated schemas found, attempting on-demand generation for service', serviceName);
  return generateSchemasForService(serviceName, outputDir).map(({ schema }) => schema);
}
