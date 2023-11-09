// require-strict-assert.spec.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
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
            message: 'Invalid form of strict assertion mode',
          },
        ],
        output: `import { strict as assert } from 'node:assert';`,
      },
      {
        code: `import assert from 'node:assert';`,
        errors: [
          {
            message: 'Invalid form of strict assertion mode',
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
            message: 'Invalid form of strict assertion mode',
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
            message: 'Invalid form of strict assertion mode',
          },
          {
            message: 'strict method not required when in strict assertion mode.',
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
            message: 'strict method not required when in strict assertion mode.',
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
            message: 'strict method not required when in strict assertion mode.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.deepEqual(obj1, obj2);`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.notStrictEqual(value1, value2);`,
        errors: [
          {
            message: 'strict method not required when in strict assertion mode.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.notEqual(value1, value2);`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.notDeepStrictEqual(obj1, obj2);`,
        errors: [
          {
            message: 'strict method not required when in strict assertion mode.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               assert.notDeepEqual(obj1, obj2);`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
               const val1 = 'val2';
               assert.strict(val1, 'val2');`,
        errors: [
          {
            message: 'strict method not required when in strict assertion mode.',
          },
        ],
        output: `import { strict as assert } from 'node:assert';
               const val1 = 'val2';
               assert.equal(val1, 'val2');`,
      },
      {
        code: `import assert from 'node:assert/strict';`,
        errors: [
          {
            message: 'Invalid form of strict assertion mode',
          },
        ],
        output: `import { strict as assert } from 'node:assert';`,
      },
    ],
  });
});
