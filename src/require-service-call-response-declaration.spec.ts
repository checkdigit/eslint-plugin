// require-service-call-response-declaration.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from './ts-tester.test';
import rule, { ruleId } from './require-service-call-response-declaration.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'awaited service wrapper call with the legacy typings already has a response variable declared',
      code: `
          import type { Endpoint } from './typings.test.ts';
          async function getKey(pingService: Endpoint) {
            const response = await pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
            // assert.ok(response.status===2000)
          }
        `,
    },
    {
      name: 'awaited service wrapper call with the latest service typings already has a response variable declared',
      code: `
          import type { SampleApi } from './typings.test.ts';
          async function getKey(pingService: SampleApi) {
            const response = await pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
            // assert.ok(response.status===2000)
          }
        `,
    },
    {
      name: 'awaited fetch service call already has a response variable declared',
      code: `const response = await fetch(\`https://ping.checkdigit/ping/v1/ping\`);`,
    },
    {
      name: 'non-awaited service wrapper call with the legacy typings without response variable declared',
      code: `
          import type { Endpoint } from './typings.test.ts';
          function getKey(pingService: Endpoint) {
            pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
    },
    {
      name: 'non-awaited service wrapper call with the latest service typings without response variable declared',
      code: `
          import type { SampleApi } from './typings.test.ts';
          function getKey(pingService: SampleApi) {
            return pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
    },
    {
      name: 'awaited fetch service call without a response variable declared',
      code: `fetch(\`https://ping.checkdigit/ping/v1/ping\`);`,
    },
  ],
  invalid: [
    {
      name: 'awaited service wrapper call with the legacy type does not have variable declared',
      code: `
          import type { Endpoint } from './typings.test.ts';
          async function getKey(pingService: Endpoint) {
            await pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      errors: [{ messageId: 'requireServiceCallResponseDeclaration' }],
    },
    {
      name: 'awaited service wrapper call with the latest service typings does not have variable declared',
      code: `
          import type { SampleApi } from './typings.test.ts';
          async function getKey(pingService: SampleApi) {
            await pingService.get(\`/ping/v1/ping\`, {
              resolveWithFullResponse: true,
            });
          }
        `,
      errors: [{ messageId: 'requireServiceCallResponseDeclaration' }],
    },
    {
      name: 'awaited fetch service call does not have variable declared',
      code: `await fetch(\`https://ping.checkdigit/ping/v1/ping\`);`,
      errors: [{ messageId: 'requireServiceCallResponseDeclaration' }],
    },
  ],
});
