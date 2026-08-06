// tester.test.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import './setup.test.ts';

export default function createTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  });
}
