// require-strict-assert.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './require-strict-assert';

// file.only
describe('require-strict-assert', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020, sourceType: 'module' } });
  ruleTester.run('require-strict-assert', rule, {
    valid: [
      {
        code: `import { strict as assert } from 'node:assert';`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
                import otherModule from 'other-module';`,
      },
    ],
    invalid: [
      {
        code: `import assert from 'node:assert';`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
        ],
      },
      {
        code: `import { deepStrictEqual } from 'node:assert';`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
        ],
      },
    ],
  });
});
