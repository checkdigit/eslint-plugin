// no-util.spec.ts

/*
 * Copyright (c) 2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule, { ruleId } from './no-util.ts';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case with hello.ts',
      code: `test`,
      filename: 'hello.ts',
    },
    {
      name: 'Valid case with testUtil.ts',
      code: `test`,
      filename: 'testUtil.ts',
    },
    {
      name: 'Valid case with utilTest.ts',
      code: `test`,
      filename: 'utilTest.ts',
    },
    {
      name: 'Valid case with /src/test-utility.ts',
      code: `test`,
      filename: '/src/test-utility.ts',
    },
    {
      name: 'Valid case with test-utility.ts',
      code: `test`,
      filename: 'test-utility.ts',
    },
  ],
  invalid: [
    {
      name: 'Invalid case with util.ts',
      code: `test`,
      filename: 'util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with src/util.ts',
      code: `test`,
      filename: 'src/util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util.spec.ts',
      code: `test`,
      filename: '/util.spec.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with util.test.ts',
      code: `test`,
      filename: 'util.test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with util-test.ts',
      code: `test`,
      filename: 'util-test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with test-util.ts',
      code: `test`,
      filename: 'test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/test-Util.ts',
      code: `test`,
      filename: '/util/test-Util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/test-util.ts',
      code: `test`,
      filename: '/util/test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/util-Test.ts',
      code: `test`,
      filename: '/util/util-Test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/utility-Test.ts',
      code: `test`,
      filename: '/util/utility-Test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /src/test-util.ts',
      code: `test`,
      filename: '/src/test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
  ],
});
