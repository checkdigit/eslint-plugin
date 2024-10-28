// agent/fetch-response-body-json.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './fetch-response-body-json';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no change if no "json" property is found in the response type',
      code: `
        const response = {body: 'foo'};
        const body = response.body;
      `,
    },
  ],
  invalid: [
    {
      name: 'replace statusCode with status',
      code: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        const body = response.body;
      `,
      output: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        const body = (await response.json());
      `,
      errors: [{ messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'replace statusCode with status in chained access',
      code: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        return response.body.data;
      `,
      output: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        return (await response.json()).data;
      `,
      errors: [{ messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'no redundant "await" for return statement.',
      code: `
        async function foo() {
          const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
          return response.body;
        }
      `,
      output: `
        async function foo() {
          const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
          return response.json();
        }
      `,
      errors: [{ messageId: 'replaceBodyWithJson' }],
    },
  ],
});
