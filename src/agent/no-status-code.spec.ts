// agent/no-status-code.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-status-code';
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
      name: 'no change if no "status" property is found in the response type',
      code: `
        const response = {statusCode: 200};
        const status = response.statusCode;
      `,
    },
  ],
  invalid: [
    {
      name: 'replace statusCode with status',
      code: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        const status = response.statusCode;
      `,
      output: `
        const response = await fetch(\`https://ping.checkdigit/ping/v1/key/\${keyId}\`);
        const status = response.status;
      `,
      errors: [{ messageId: 'replaceStatusCode' }],
    },
  ],
});