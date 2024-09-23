// require-resolve-full-response.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './require-resolve-full-response';
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
    {
      name: 'no error if service wrapper call sets resolveWithFullResponse as true',
      code: `
          async function getKey(pingService: Endpoint) {
            await pingService.get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
    },
  ],
  invalid: [
    {
      name: 'service wrapper passed in as a function argument with type as Endpoint',
      code: `
          async function getKey(pingService: Endpoint) {
            await pingService.get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'service wrapper passed in as a function argument with type as ResolvedService',
      code: `
          async function getKey(
            pingService: ResolvedService,
            request: InboundContext
          ) {
            await pingService(request).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'service configuration passed in as a argument with type as Configuration',
      code: `
          async function getKey(
            config: Configuration,
          ) {
            await config.service.ping(EMPTY_CONTEXT).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'fixture passed in as a argument',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fixture.config.service.ping(EMPTY_CONTEXT).get(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'url declared as a variable',
      code: `
        const url = \`\${PING_BASE_PATH}/key/\${keyId}\`;
        await pingService.get(url, {
          resolveWithFullResponse: false,
        });
      `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'handle request with headers',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            await fixture.config.service.ping(EMPTY_CONTEXT).head(\`\${PING_BASE_PATH}/key/\${keyId}\`, {
              resolveWithFullResponse: false,
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'handle request with body',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await pingService.put(\`\${PING_BASE_PATH}/key/\${keyId}\`, {data:'hi'}, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'handle PUT request with undefined body',
      code: `
          async function getKey(
            fixture: Fixture,
          ) {
            const pingService = fixture.config.service.ping(EMPTY_CONTEXT);
            const response = await pingService.put(\`\${PING_BASE_PATH}/key/\${keyId}\`, undefined, {
              resolveWithFullResponse: false,
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
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
              headers: {
                etag: '123',
              },
            });
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
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
            );
            if (newKeyResponse.statusCode !== StatusCodes.OK) {
              throw new Error('failed');
            }
            return newKeyResponse.body;
          }
        `,
      errors: [{ messageId: 'invalidOptions' }],
    },
    {
      name: 'handle multi-line url string literal',
      code: `
        await pingService.get(\`/message/v1/picked-request?cardId=\${cardIds.toString()}fromDate={encodeURIComponent(
          fromDate,
        )}toDate=\${encodeURIComponent(
          toDate,
        )}fields=ADVICE_RESPONSE,CATEGORIZATION,CREATED_ON,MATCHED_MESSAGE_ID,SETTLEMENT_AMOUNT,MESSAGE_ID,RECEIVED_DATE_TIME\`);
      `,
      errors: [{ messageId: 'invalidOptions' }],
    },
  ],
});
