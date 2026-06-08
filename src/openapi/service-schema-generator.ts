// openapi/service-schema-generator.ts

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import debug from 'debug';

import { type ApiSchemas, buildApiSchemaFromYaml } from './generate-schema.ts';

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
  const packageJsonString = readFileSync(`./package.json`, 'utf-8');
  const packageJson = JSON.parse(packageJsonString) as unknown as { name: string };
  const [org, projectName] = packageJson.name.slice(1).split('/');
  if (org === undefined) {
    return null;
  }

  if (projectName === serviceName) {
    log('service is the current project, looking for API schemas locally', serviceName);
    const serviceSource = findServiceLocally('.', org, serviceName);
    if (serviceSource !== null) {
      return serviceSource;
    }
  }

  return null;
}

function findServiceInNodeModules(serviceName: string): ServiceSource | null {
  for (const org of GITHUB_ORGANIZATIONS) {
    const serviceFolder = `node_modules/@${org}/${serviceName}`;
    if (!existsSync(serviceFolder)) {
      continue;
    }

    try {
      const serviceSource = findServiceLocally(serviceFolder, org, serviceName);
      if (serviceSource !== null) {
        return serviceSource;
      }
    } catch {
      // continue to next org
    }
  }
  return null;
}

// Shallow-clone the repo with blob filtering so only the objects we explicitly
// request via `git show HEAD:<path>` are downloaded, keeping network usage minimal.
function findServiceOnGitHub(serviceName: string): ServiceSource | null {
  for (const org of GITHUB_ORGANIZATIONS) {
    const repoUrl = `https://github.com/${org}/${serviceName}.git`;
    const tmpDir = mkdtempSync(join(tmpdir(), `eslint-athena-${serviceName}-`));
    try {
      log(`cloning ${repoUrl}`);
      execFileSync('git', ['clone', '--depth=1', '--no-checkout', '--filter=blob:none', repoUrl, tmpDir], {
        timeout: 30_000,
        stdio: 'pipe',
      });

      let pkgContent: string;
      try {
        pkgContent = execFileSync('git', ['-C', tmpDir, 'show', 'HEAD:package.json'], {
          encoding: 'utf-8',
          timeout: 10_000,
        });
      } catch {
        continue;
      }

      const config = readServiceConfig(pkgContent, org, serviceName);
      if (config === null) {
        continue;
      }

      const endpoints: ServiceEndpoint[] = [];
      for (const endpoint of config.endpoints) {
        const swaggerPath = `${config.apiRoot}/${endpoint}/swagger.yml`;
        try {
          log(`reading ${swaggerPath} from ${repoUrl}`);
          const yamlContent = execFileSync('git', ['-C', tmpDir, 'show', `HEAD:${swaggerPath}`], {
            encoding: 'utf-8',
            timeout: 10_000,
          });
          endpoints.push({ path: endpoint, yamlContent });
        } catch {
          // file absent in this repo/org; continue to next endpoint
        }
      }

      if (endpoints.length > 0) {
        return { organization: config.organization, serviceName: config.serviceName, endpoints };
      }
    } catch {
      // repo not found for this org; try next
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }
  return null;
}

export function generateSchemasForService(
  serviceName: string,
  outputDir?: string,
): { schema: ApiSchemas; endpoint: string }[] {
  log('generating schemas for service', serviceName);

  const source =
    findServiceInProject(serviceName) ?? findServiceInNodeModules(serviceName) ?? findServiceOnGitHub(serviceName);
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
