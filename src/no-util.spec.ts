// no-util.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

import rule from './no-util';

describe('no-util', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });
  ruleTester.run('no-util', rule, {
    valid: [
      {
        filename: 'hello.ts',
        code: `test`,
      },
      {
        filename: 'testUtil.ts',
        code: `test`,
      },
      {
        filename: 'utilTest.ts',
        code: `test`,
      },
      {
        filename: '/src/test-utility.ts',
        code: `test`,
      },
    ],
    invalid: [
      {
        filename: 'util.ts',
        code: `test`,
        errors: [{ message: `File name 'util.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: 'src/util.ts',
        code: `test`,
        errors: [{ message: `File name 'src/util.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/util.spec.ts',
        code: `test`,
        errors: [{ message: `File name '/util.spec.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: 'util.test.ts',
        code: `test`,
        errors: [{ message: `File name 'util.test.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: 'util-test.ts',
        code: `test`,
        errors: [{ message: `File name 'util-test.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: 'test-util.ts',
        code: `test`,
        errors: [{ message: `File name 'test-util.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/util/test-Util.ts',
        code: `test`,
        errors: [{ message: `File name '/util/test-Util.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/util/test-util.ts',
        code: `test`,
        errors: [{ message: `File name '/util/test-util.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/util/util-Test.ts',
        code: `test`,
        errors: [{ message: `File name '/util/util-Test.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/util/utility-Test.ts',
        code: `test`,
        errors: [{ message: `File name '/util/utility-Test.ts' contains banned 'util' pattern.` }],
      },
      {
        filename: '/src/test-util.ts',
        code: `test`,
        errors: [{ message: `File name '/src/test-util.ts' contains banned 'util' pattern.` }],
      },
    ],
  });
});
