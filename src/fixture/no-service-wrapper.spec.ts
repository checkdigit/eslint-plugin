// fixture/no-service-wrapper.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-service-wrapper';
import { RuleTester } from '@typescript-eslint/rule-tester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: `${process.cwd()}/ts-init`,
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'none service wrapper call will not trigger an error',
      code: `response.headers.get('foo');`,
    },
  ],
  invalid: [
    {
      name: 'service wrapper passed in as a function argument with type as Endpoint',
      code: `
          async function getKey(pingService: Endpoint) {
            await pingService.get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(pingService: Endpoint) {
            await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'GET',
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'service wrapper passed in as a function argument with type as ResolvedService',
      code: `
          async function getKey(
            pingService: ResolvedService,
            request: InboundContext
          ) {
            await pingService(request).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(
            pingService: ResolvedService,
            request: InboundContext
          ) {
            await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'GET',
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'service configuration passed in as a argument with type as Configuration',
      code: `
          async function getKey(
            config: Configuration,
          ) {
            await config.service.ping(EMPTY_CONTEXT).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(
            config: Configuration,
          ) {
            await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'GET',
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'fixture passed in as a argument',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fixture.config.service.ping(EMPTY_CONTEXT).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'GET',
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'url declared as a variable',
      code: `
        const url = \`\${PING_BASE_PATH}/key/\${keyId}\`;
        await pingService.get(url, {
          resolveWithFullResponse: true,
        });
      `,
      output: `
        const url = \`\${PING_BASE_PATH}/key/\${keyId}\`;
        await fetch(url, {
          method: 'GET',
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle request with headers',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fixture.config.service.ping(EMPTY_CONTEXT).head(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        `,
      output: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'HEAD',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle request with body',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await pingService.put(\`\${PING_BASE_PATH}/key/\${keyId}\`, {data:'hi'}, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'PUT',
              body: JSON.stringify({data:'hi'}),
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle PUT request with undefined body',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await pingService.put(\`\${PING_BASE_PATH}/key/\${keyId}\`, undefined, {
              resolveWithFullResponse: true,
            });
          }
        `,
      output: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'PUT',
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle request with both body and headers',
      code: `
          async function getKey(
            fixture: Fixture,
            keyRequest: ping.KeyRequest,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await pingService.post(\`\${PING_BASE_PATH}/key/\${keyId}\`, keyRequest, {
              resolveWithFullResponse: true,
              headers: {
                etag: '123',
              },
            });
          }
        `,
      output: `
          async function getKey(
            fixture: Fixture,
            keyRequest: ping.KeyRequest,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'POST',
              headers: {
                etag: '123',
              },
              body: JSON.stringify(keyRequest),
            });
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'initiate and call serve-runtime service in the same function',
      code: `
          import type { Configuration, InboundContext } from '@checkdigit/serve-runtime';
          import type { pingV1 as ping } from '../services';

          export async function createKey(
            config: Configuration,
            inboundContext: InboundContext,
            keyRequest: ping.KeyRequest,
          ): Promise<ping.Key> {
            const pingService = config.service.ping(inboundContext);
            const newKeyResponse = await pingService.put(
              \`\${PING_BASE_PATH}/key/\${keyId}\`,
              keyRequest,
              {
                resolveWithFullResponse: true,
              },
            );
            if (newKeyResponse.statusCode !== StatusCodes.OK) {
              throw new Error('failed');
            }
            return newKeyResponse.body;
          }
        `,
      output: `
          import type { Configuration, InboundContext } from '@checkdigit/serve-runtime';
          import type { pingV1 as ping } from '../services';

          export async function createKey(
            config: Configuration,
            inboundContext: InboundContext,
            keyRequest: ping.KeyRequest,
          ): Promise<ping.Key> {
            const pingService = config.service.ping(inboundContext);
            const newKeyResponse = await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              method: 'PUT',
              body: JSON.stringify(keyRequest),
            });
            if (newKeyResponse.statusCode !== StatusCodes.OK) {
              throw new Error('failed');
            }
            return newKeyResponse.body;
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'convert url to add domain',
      code: `
        await pingService.get(\`/ping/v1/key/\${keyId}\`, {
          resolveWithFullResponse: true,
        });
      `,
      output: `
        await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`, {
          method: 'GET',
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'works with string literal url as well',
      code: `
        await pingService.get('/ping/v1/ping', {
          resolveWithFullResponse: true,
        });
      `,
      output: `
        await fetch('https://ping.checkdigit/ping/v1/ping', {
          method: 'GET',
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'do not convert url containing BASE_PATH constant for the main service',
      code: `
        await service.get(\`\${BASE_PATH}/key/\${keyId}\`, {
          resolveWithFullResponse: true,
        });
      `,
      output: `
        await fetch(\`\${BASE_PATH}/key/\${keyId}\`, {
          method: 'GET',
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'do not convert url containing BASE_PATH like constant for the dependent service',
      code: `
        await pingService.get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
          resolveWithFullResponse: true,
        });
      `,
      output: `
        await fetch(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
          method: 'GET',
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
  ],
});
