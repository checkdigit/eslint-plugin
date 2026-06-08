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
    log(`[github] service is the current project, looking for API schemas locally`);
    const serviceSource = findServiceLocally('.', org, serviceName);
    if (serviceSource !== null) {
      return serviceSource;
    }
  }

  return null;
}

// function findServiceInNodeModules(serviceName: string): ServiceSource | null {
//   for (const org of GITHUB_ORGANIZATIONS) {
//     const serviceFolder = `node_modules/@${org}/${serviceName}`;
//     if (!existsSync(serviceFolder)) {
//       continue;
//     }
//     try {
//       const serviceSource = findServiceLocally(serviceFolder, org, serviceName);
//       if (serviceSource !== null) {
//         return serviceSource;
//       }
//     } catch {
//       // continue to next org
//     }
//   }
//   return null;
// }

// ---------------------------------------------------------------------------
// GitHub strategies — REST API (GITHUB_TOKEN) with git-clone local fallback
// ---------------------------------------------------------------------------

// Fetch a single file from the GitHub Contents API using a bearer token.
// Uses `Accept: application/vnd.github.v3.raw` so the body is the raw file, not JSON.
function fetchFileFromGitHubApi(org: string, repo: string, filePath: string, token: string): string | null {
  try {
    return execFileSync(process.execPath, ['--input-type=module'], {
      env: {
        ...process.env,
        _ATHENA_URL: `https://api.github.com/repos/${org}/${repo}/contents/${filePath}`,
        _ATHENA_TOKEN: token,
      },
      input: [
        `const r = await fetch(process.env._ATHENA_URL, { headers: {`,
        `  Accept: 'application/vnd.github.v3.raw',`,
        `  Authorization: 'Bearer ' + process.env._ATHENA_TOKEN,`,
        `  'User-Agent': 'eslint-plugin-checkdigit',`,
        `}});`,
        `if (!r.ok) process.exit(1);`,
        `process.stdout.write(await r.text());`,
      ].join('\n'),
      encoding: 'utf-8',
      timeout: 15_000,
    });
  } catch {
    return null;
  }
}

function findServiceViaApi(serviceName: string, org: string, token: string): ServiceSource | null {
  log(`[github] trying GitHub API for ${org}/${serviceName} (GITHUB_TOKEN: set)`);
  const pkgContent = fetchFileFromGitHubApi(org, serviceName, 'package.json', token);
  if (pkgContent === null) {
    log(`[github] GitHub API: package.json not found for ${org}/${serviceName}`);
    return null;
  }

  try {
    const config = readServiceConfig(pkgContent, org, serviceName);
    if (config === null) {
      log(`[github] GitHub API: no service API config in package.json for ${org}/${serviceName}`);
      return null;
    }

    const endpoints: ServiceEndpoint[] = [];
    for (const endpoint of config.endpoints) {
      const swaggerPath = `${config.apiRoot}/${endpoint}/swagger.yml`;
      log(`[github] GitHub API: fetching ${swaggerPath} for ${org}/${serviceName}`);
      const yamlContent = fetchFileFromGitHubApi(org, serviceName, swaggerPath, token);
      if (yamlContent !== null) {
        endpoints.push({ path: endpoint, yamlContent });
      } else {
        log(`[github] GitHub API: ${swaggerPath} not found for ${org}/${serviceName}`);
      }
    }

    return endpoints.length > 0
      ? { organization: config.organization, serviceName: config.serviceName, endpoints }
      : null;
  } catch (error) {
    log(
      `[github] GitHub API error for ${org}/${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

// Shallow-clone with blob filtering: only commit + tree objects are fetched up
// front; `git show HEAD:<path>` lazily pulls each blob we actually need.
// Git uses its own credential system (keychain, SSH keys, credential helpers)
// and does not read GITHUB_TOKEN, so this works in local dev without a token.
function findServiceViaGitClone(serviceName: string, org: string): ServiceSource | null {
  const repoUrl = `https://github.com/${org}/${serviceName}.git`;
  const tmpDir = mkdtempSync(join(tmpdir(), `eslint-athena-${serviceName}-`));
  try {
    log(`[github] trying git clone for ${org}/${serviceName}`);
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
      log(`[github] git clone: package.json not found for ${org}/${serviceName}`);
      return null;
    }

    const config = readServiceConfig(pkgContent, org, serviceName);
    if (config === null) {
      log(`[github] git clone: no service API config in package.json for ${org}/${serviceName}`);
      return null;
    }

    const endpoints: ServiceEndpoint[] = [];
    for (const endpoint of config.endpoints) {
      const swaggerPath = `${config.apiRoot}/${endpoint}/swagger.yml`;
      try {
        log(`[github] git clone: reading ${swaggerPath} for ${org}/${serviceName}`);
        const yamlContent = execFileSync('git', ['-C', tmpDir, 'show', `HEAD:${swaggerPath}`], {
          encoding: 'utf-8',
          timeout: 10_000,
        });
        endpoints.push({ path: endpoint, yamlContent });
      } catch {
        log(`[github] git clone: ${swaggerPath} not found for ${org}/${serviceName}`);
      }
    }

    return endpoints.length > 0
      ? { organization: config.organization, serviceName: config.serviceName, endpoints }
      : null;
  } catch (error) {
    log(
      `[github] git clone failed for ${org}/${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function findServiceOnGitHub(serviceName: string): ServiceSource | null {
  const token = process.env['GITHUB_TOKEN'];
  for (const org of GITHUB_ORGANIZATIONS) {
    if (token !== undefined) {
      const source = findServiceViaApi(serviceName, org, token);
      if (source !== null) {
        return source;
      }
    }
    const source = findServiceViaGitClone(serviceName, org);
    if (source !== null) {
      return source;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// npm registry strategy — kept for reference (slow; disabled)
// ---------------------------------------------------------------------------

// function findServiceViaNpm(serviceName: string, org: string): ServiceSource | null {
//   const npmToken = process.env['NPM_TOKEN'];
//   const packageName = `@${org}/${serviceName}`;
//   const tmpDir = mkdtempSync(join(tmpdir(), `eslint-athena-${serviceName}-`));
//   try {
//     writeFileSync(join(tmpDir, 'package.json'), '{}');
//     if (npmToken !== undefined) {
//       writeFileSync(
//         join(tmpDir, '.npmrc'),
//         `@${org}:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=\${NPM_TOKEN}\n`,
//       );
//     }
//     execFileSync('npm', ['install', '--prefix', tmpDir, '--no-package-lock', '--ignore-scripts', packageName], {
//       timeout: 60_000,
//       stdio: 'pipe',
//       env: { ...process.env },
//     });
//     return findServiceLocally(`${tmpDir}/node_modules/${packageName}`, org, serviceName);
//   } catch {
//     return null;
//   } finally {
//     rmSync(tmpDir, { recursive: true, force: true });
//   }
// }

export function generateSchemasForService(
  serviceName: string,
  outputDir?: string,
): { schema: ApiSchemas; endpoint: string }[] {
  log(`[schema-generator] locating service '${serviceName}'`);

  let source = findServiceInProject(serviceName);
  if (source !== null) {
    log(`[schema-generator] found '${serviceName}' in current project`);
  }

  // findServiceInNodeModules — skipped: prefer fresh copy from GitHub
  // findServiceViaNpm       — skipped: too slow

  if (source === null) {
    log(
      `[schema-generator] trying GitHub for '${serviceName}' (GITHUB_TOKEN: ${process.env['GITHUB_TOKEN'] !== undefined ? 'set' : 'not set'})`,
    );
    source = findServiceOnGitHub(serviceName);
    if (source !== null) {
      log(`[schema-generator] found '${serviceName}' via GitHub`);
    }
  }

  if (source === null) {
    log(`[schema-generator] no swagger source found for '${serviceName}'`);
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
        log(`[schema-generator] cached schema to ${dir}/${SWAGGER_SCHEMA_DEREF_FILENAME}`);
      }
    } catch (error) {
      log(
        `[schema-generator] error processing endpoint ${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return results;
}
