// openapi/service-schema-generator.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import debug from 'debug';

import { type ApiSchemas, buildApiSchemaFromYaml } from './generate-schema.ts';

const log = debug('eslint-plugin:athena:service-schema-generator');

const GITHUB_ORGANIZATIONS = ['checkdigit', 'rebolt-checkdigit'] as const;
const SWAGGER_SCHEMA_DEREF_FILENAME = 'swagger.schema.deref.json';

function errorMessageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ServiceEndpoint {
  path: string;
  yamlContent: string;
}

interface ServiceSource {
  organization: string;
  serviceName: string;
  endpoints: ServiceEndpoint[];
}

function derefApiSchemas(schemas: ApiSchemas): ApiSchemas {
  const definitions = schemas.definitions ?? {};

  function derefValue(value: unknown, resolving: Set<string> = new Set<string>()): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => derefValue(item, resolving));
    }
    const obj = value as Record<string, unknown>;
    if (typeof obj['$ref'] === 'string') {
      const refName = /\/definitions\/(?<name>[^/]+)$/u.exec(obj['$ref'])?.groups?.['name'];
      if (refName !== undefined && !resolving.has(refName)) {
        return derefValue(definitions[refName], new Set<string>([...resolving, refName]));
      }
    }
    return Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, derefValue(val, resolving)]));
  }

  const resolvedApis = derefValue(schemas.apis) as ApiSchemas['apis'];
  if (schemas.definitions !== undefined) {
    return {
      apis: resolvedApis,
      definitions: derefValue(schemas.definitions) as NonNullable<ApiSchemas['definitions']>,
    };
  }
  return { apis: resolvedApis };
}

function readServiceConfig(
  packageJsonContent: string,
  org: string,
  serviceName: string,
): { organization: string; serviceName: string; apiRoot: string; endpoints: string[] } | null {
  const packageJson = JSON.parse(packageJsonContent) as {
    name?: string;
    service?: { api?: { root?: string; endpoints?: string[] } };
  };
  const apiRoot = packageJson.service?.api?.root;
  const apiEndpoints = packageJson.service?.api?.endpoints;
  if (apiRoot === undefined || apiEndpoints === undefined || apiEndpoints.length === 0) {
    return null;
  }
  const [pkgOrg = org, pkgServiceName = serviceName] = packageJson.name?.slice(1).split('/') ?? [];
  return { organization: pkgOrg, serviceName: pkgServiceName, apiRoot, endpoints: apiEndpoints };
}

function findServiceLocally(serviceFolder: string, org: string, serviceName: string): ServiceSource | null {
  const config = readServiceConfig(readFileSync(`${serviceFolder}/package.json`, 'utf-8'), org, serviceName);
  if (config === null) {
    return null;
  }

  const endpoints: ServiceEndpoint[] = [];
  for (const endpoint of config.endpoints) {
    const swaggerPath = `${serviceFolder}/${config.apiRoot}/${endpoint}/swagger.yml`;
    if (existsSync(swaggerPath)) {
      endpoints.push({ path: endpoint, yamlContent: readFileSync(swaggerPath, 'utf-8') });
    }
  }

  if (endpoints.length > 0) {
    return { organization: config.organization, serviceName: config.serviceName, endpoints };
  }
  return null;
}

function findServiceInProject(serviceName: string): ServiceSource | null {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8')) as { name?: string };
  const [org, projectName] = (packageJson.name ?? '').slice(1).split('/');
  if (org === undefined || projectName !== serviceName) {
    return null;
  }
  log(`[schema-generator] '${serviceName}' is the current project, reading local swagger files`);
  return findServiceLocally('.', org, serviceName);
}

function findServiceInNodeModules(serviceName: string): ServiceSource | null {
  for (const org of GITHUB_ORGANIZATIONS) {
    const serviceFolder = `node_modules/@${org}/${serviceName}`;
    if (!existsSync(serviceFolder)) {
      log(`[schema-generator] not found in node_modules: @${org}/${serviceName}`);
      continue;
    }
    try {
      log(`[schema-generator] found in node_modules: @${org}/${serviceName}, reading swagger files`);
      const source = findServiceLocally(serviceFolder, org, serviceName);
      if (source !== null) {
        return source;
      }
      log(`[schema-generator] no swagger schema inside node_modules/@${org}/${serviceName}`);
    } catch (error) {
      log(`[schema-generator] error reading node_modules/@${org}/${serviceName}: ${errorMessageFromError(error)}`);
    }
  }
  return null;
}

export function generateSchemasForService(
  serviceName: string,
  outputDir?: string,
): { schema: ApiSchemas; endpoint: string }[] {
  log(`[schema-generator] locating service '${serviceName}'`);

  const source = findServiceInProject(serviceName) ?? findServiceInNodeModules(serviceName);
  if (source === null) {
    log(
      `[schema-generator] '${serviceName}' not found — ensure it is listed as a devDependency or the repo is accessible via git`,
    );
    return [];
  }

  log(`[schema-generator] found '${serviceName}' (${source.endpoints.length.toString()} endpoint(s))`);

  const results: { schema: ApiSchemas; endpoint: string }[] = [];
  for (const { path: endpoint, yamlContent } of source.endpoints) {
    try {
      const rawSchema = buildApiSchemaFromYaml(yamlContent, source.organization, source.serviceName);
      if (rawSchema === null) {
        continue;
      }
      const schema = derefApiSchemas(rawSchema);
      results.push({ schema, endpoint });

      if (outputDir !== undefined) {
        const versionFolder = endpoint.split('/').at(-1) ?? endpoint;
        const dir = `${outputDir}/${versionFolder}`;
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/${SWAGGER_SCHEMA_DEREF_FILENAME}`, JSON.stringify(schema, undefined, 2));
        log(`[schema-generator] cached schema to ${dir}/${SWAGGER_SCHEMA_DEREF_FILENAME}`);
      }
    } catch (error) {
      log(`[schema-generator] error processing endpoint ${endpoint}: ${errorMessageFromError(error)}`);
    }
  }

  return results;
}
