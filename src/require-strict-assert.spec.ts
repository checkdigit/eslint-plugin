// require-strict-assert.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */
import { RuleTester } from 'eslint';

import rule from './require-strict-assert';

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
        code: `import * as assert from 'node:assert';`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';`,
      },
      {
        code: `import assert from 'node:assert';`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';`,
      },
      {
        code: `import * as assert from 'node:assert';
               import otherModule1 from 'other-module1';
               import otherModule2 from 'other-module2';`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               import otherModule1 from 'other-module1';
               import otherModule2 from 'other-module2';`,
      },
      {
        code: `import assert from 'node:assert';
               assert.strictEqual(value1, value2);`,
        errors: [
          {
            message: 'Require the strict version of node:assert.',
          },
          {
            message: 'Use non-strict counterpart for assert function.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.equal(value1, value2);`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.strictEqual(value1, value2);`,
        errors: [
          {
            message: 'Use non-strict counterpart for assert function.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.equal(value1, value2);`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.deepStrictEqual(obj1, obj2);`,
        errors: [
          {
            message: 'Use non-strict counterpart for assert function.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.deepEqual(obj1, obj2);`,
      },
    ],
  });
});
