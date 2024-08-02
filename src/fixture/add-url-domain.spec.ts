// fixture/add-url-domain.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './add-url-domain';
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
      code: `export const BASE_PATH = 'https://ping.checkdigit/ping/v1';`,
    },
  ],
  invalid: [
    {
      name: 'add domain to url constant variable BASE_PATH',
      code: `export const BASE_PATH = '/ping/v1';`,
      output: `export const BASE_PATH = 'https://ping.checkdigit/ping/v1';`,
      errors: [{ messageId: 'addDomain' }],
    },
    {
      name: 'add domain to url constant variable BASE_PATH defined with template literal',
      code: `export const BASE_PATH = \`/ping/v1\`;`,
      output: `export const BASE_PATH = \`https://ping.checkdigit/ping/v1\`;`,
      errors: [{ messageId: 'addDomain' }],
    },
    {
      name: 'add domain to BASE_PATH like url constant variable',
      code: `const FOO_BAR_BASE_PATH = '/foo-bar/v1';`,
      output: `const FOO_BAR_BASE_PATH = 'https://foo-bar.checkdigit/foo-bar/v1';`,
      errors: [{ messageId: 'addDomain' }],
    },
  ],
});
