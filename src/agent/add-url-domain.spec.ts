// agent/add-url-domain.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

// import createTester from '../ts-tester.test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import tsParser from '@typescript-eslint/parser';
import rule, { ruleId } from './add-url-domain';

// createTester()

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      project: '../tsconfig.json',
      tsconfigRootDir: `${process.cwd()}/ts-init`,
    },
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'no change if the url already has domain',
      code: `export const BASE_PATH = 'https://ping.checkdigit/ping/v1';`,
    },
  ],
  invalid: [
    {
      name: 'add domain to url constant variable BASE_PATH as string',
      code: `export const BASE_PATH = '/ping/v1';`,
      output: `export const BASE_PATH = 'https://ping.checkdigit/ping/v1';`,
      errors: [{ messageId: 'addDomain' }],
    },
    {
      name: 'add domain to url constant variable BASE_PATH as template literal',
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
