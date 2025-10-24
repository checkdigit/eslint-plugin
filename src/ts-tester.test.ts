// ts-tester.test.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

export default function createTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        project: '../tsconfig.json',
        tsconfigRootDir: `${process.cwd()}/ts-init`,
      },
    },
  });
}
