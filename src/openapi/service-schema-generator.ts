// openapi/service-schema-generator.ts

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import debug from 'debug';

import { type ApiSchemas, buildApiSchemaFromYaml } from './generate-schema';

const log = debug('eslint-plugin:athena:service-schema-generator');

const GITHUB_ORGANIZATIONS = ['checkdigit', 'rebolt-checkdigit'] as const;
const SWAGGER_SCHEMA_DEREF_FILENAME = 'swagger.schema.deref.json';

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

function fetchUrlSync(url: string): string | null {
  try {
    return execFileSync(process.execPath, ['--input-type=module'], {
      input: `const r=await fetch(${JSON.stringify(url)});if(!r.ok)process.exit(1);process.stdout.write(await r.text());`,
      encoding: 'utf-8',
      timeout: 15_000,
    });
  } catch {
    return null;
  }
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
  const pkgOrg = packageJson.name?.slice(1).split('/')[0] ?? org;
  const pkgServiceName = packageJson.name?.slice(1).split('/')[1] ?? serviceName;
  return { organization: pkgOrg, serviceName: pkgServiceName, apiRoot, endpoints: apiEndpoints };
}

function findServiceInNodeModules(serviceName: string): ServiceSource | null {
  for (const org of GITHUB_ORGANIZATIONS) {
    const packageDir = `node_modules/@${org}/${serviceName}`;
    const packageJsonPath = `${packageDir}/package.json`;
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    try {
      const config = readServiceConfig(readFileSync(packageJsonPath, 'utf-8'), org, serviceName);
      if (config === null) {
        continue;
      }

      const endpoints: ServiceEndpoint[] = [];
      for (const endpoint of config.endpoints) {
        const swaggerPath = `${packageDir}/${config.apiRoot}/${endpoint}/swagger.yml`;
        if (existsSync(swaggerPath)) {
          endpoints.push({ path: endpoint, yamlContent: readFileSync(swaggerPath, 'utf-8') });
        }
      }

      if (endpoints.length > 0) {
        return { organization: config.organization, serviceName: config.serviceName, endpoints };
      }
    } catch {
      // continue to next org
    }
  }
  return null;
}

function findServiceOnGitHub(serviceName: string): ServiceSource | null {
  for (const org of GITHUB_ORGANIZATIONS) {
    const pkgUrl = `https://raw.githubusercontent.com/${org}/${serviceName}/main/package.json`;
    log(`fetching package.json from ${pkgUrl}`);
    const pkgContent = fetchUrlSync(pkgUrl);
    if (pkgContent === null) {
      continue;
    }

    try {
      const config = readServiceConfig(pkgContent, org, serviceName);
      if (config === null) {
        continue;
      }

      const endpoints: ServiceEndpoint[] = [];
      for (const endpoint of config.endpoints) {
        const swaggerUrl = `https://raw.githubusercontent.com/${org}/${serviceName}/main/${config.apiRoot}/${endpoint}/swagger.yml`;
        log(`fetching swagger.yml from ${swaggerUrl}`);
        const yamlContent = fetchUrlSync(swaggerUrl);
        if (yamlContent !== null) {
          endpoints.push({ path: endpoint, yamlContent });
        }
      }

      if (endpoints.length > 0) {
        return { organization: config.organization, serviceName: config.serviceName, endpoints };
      }
    } catch {
      // continue to next org
    }
  }
  return null;
}

export function generateSchemasForService(
  serviceName: string,
  outputDir?: string,
): { schema: ApiSchemas; endpoint: string }[] {
  log('generating schemas for service', serviceName);

  const source = findServiceInNodeModules(serviceName) ?? findServiceOnGitHub(serviceName);
  if (source === null) {
    log('no swagger source found for service', serviceName);
    return [];
  }

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
        log(`cached schema to ${dir}/${SWAGGER_SCHEMA_DEREF_FILENAME}`);
      }
    } catch (error) {
      log('error generating schema for endpoint', endpoint, error);
    }
  }

  return results;
}
