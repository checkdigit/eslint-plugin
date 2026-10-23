// require-api-route-import.spec.ts

/*
 * Copyright (c) 2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, type TestContext } from 'node:test';

import { RuleTester } from '@typescript-eslint/rule-tester';

import './setup.test.ts';
import rule, { ruleId } from './require-api-route-import.ts';

function createApiFolder(
  testContext: TestContext,
  apiFolderPath: string,
  filesByRelativePath: Record<string, string>,
): string {
  const rootFolder = fs.mkdtempSync(
    path.join(os.tmpdir(), 'require-api-route-import-'),
  );
  testContext.after(() => {
    fs.rmSync(rootFolder, { recursive: true, force: true });
  });
  const apiFolder = path.join(rootFolder, apiFolderPath);
  for (const [relativePath, content] of Object.entries(filesByRelativePath)) {
    const filePath = path.join(apiFolder, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return apiFolder;
}

describe('require-api-route-import', () => {
  it('valid - every route implementation is imported, non-route siblings are ignored', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'ping.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
      'a-get.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router<'v1'>(); }`,
      'constants.ts': `export const ETAG_HEADER = 'etag';`,
      'ping.spec.ts': `import Router from '@koa/router';\nconst router = new Router();`,
      'service/b.ts': `import Router from '@koa/router';\nconst router = new Router();`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [
        {
          filename: path.join(apiFolder, 'index.ts'),
          code: `
            import type { Service } from '@checkdigit/serve-runtime';
            import ping from './ping.ts';
            import aGet from './a-get.ts';
            const service: Service = async () => [ping, aGet];
            export default service;
          `,
        },
      ],
      invalid: [],
    });
  });

  it('valid - route file - non-route sibling not imported by index.ts is not checked', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'index.ts': `import ping from './ping.ts';\nexport default async () => [ping];`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [
        {
          filename: path.join(apiFolder, 'constants.ts'),
          code: `export const ETAG_HEADER = 'etag';`,
        },
      ],
      invalid: [],
    });
  });

  it('valid - route file - imported by index.ts', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'index.ts': `import ping from './ping.ts';\nimport aGet from './a-get';\nexport default async () => [ping, aGet];`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [
        {
          filename: path.join(apiFolder, 'ping.ts'),
          code: `
            import Router from '@koa/router';
            export default async function () { const router = new Router(); }
          `,
        },
        {
          filename: path.join(apiFolder, 'a-get.ts'),
          code: `
            import Router from '@koa/router';
            export default async function () { const router = new Router<'v1'>(); }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('valid - route file - test files, sub-folders and folders without index.ts are not checked', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'index.ts': `import ping from './ping.ts';\nexport default async () => [ping];`,
    });
    const apiFolderWithoutIndex = createApiFolder(testContext, 'src/api/v2', {
      'ping.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [
        {
          filename: path.join(apiFolder, 'ping.spec.ts'),
          code: `
            import Router from '@koa/router';
            const router = new Router();
          `,
        },
        {
          filename: path.join(apiFolder, 'service/b.ts'),
          code: `
            import Router from '@koa/router';
            const router = new Router();
          `,
        },
        {
          filename: path.join(apiFolderWithoutIndex, 'a-get.ts'),
          code: `
            import Router from '@koa/router';
            export default async function () { const router = new Router(); }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('invalid - route file - newly added route implementation is not imported by index.ts', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'index.ts': `import ping from './ping.ts';\n// import aPut from './a-put.ts';\nexport default async () => [ping];`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          filename: path.join(apiFolder, 'a-put.ts'),
          code: `
            import Router from '@koa/router';
            export default async function () {
              const router = new Router();
              const anotherRouter = new Router();
            }
          `,
          errors: [
            {
              messageId: 'requireImportByApiIndex',
              line: 4,
              column: 30,
            },
          ],
        },
      ],
    });
  });

  it('invalid - newly added route implementation is not imported', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v1', {
      'ping.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
      'a-put.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          filename: path.join(apiFolder, 'index.ts'),
          code: `
            import ping from './ping.ts';
            export default async () => [ping];
          `,
          errors: [
            {
              messageId: 'requireApiRouteImport',
              data: { routeFileName: 'a-put.ts' },
              line: 1,
              column: 1,
            },
          ],
        },
      ],
    });
  });

  it('invalid - every missing route implementation is reported in file name order', (testContext) => {
    const apiFolder = createApiFolder(testContext, 'src/api/v2', {
      'ping.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
      'b-get.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
      'a-put.ts': `import Router from '@koa/router';\nexport default async function () { const router = new Router(); }`,
    });
    new RuleTester().run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          filename: path.join(apiFolder, 'index.ts'),
          code: `
            import ping from './ping.ts';
            export default async () => [ping];
          `,
          errors: [
            {
              messageId: 'requireApiRouteImport',
              data: { routeFileName: 'a-put.ts' },
            },
            {
              messageId: 'requireApiRouteImport',
              data: { routeFileName: 'b-get.ts' },
            },
          ],
        },
      ],
    });
  });
});
