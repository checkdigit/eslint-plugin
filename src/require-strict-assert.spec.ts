// require-strict-assert.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './require-strict-assert.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Importing strict as assert from node:assert',
          code: `import { strict as assert } from 'node:assert';`,
        },
        {
          name: 'Importing strict as assert from node:assert with additional import',
          code: `import { strict as assert } from 'node:assert';
               import otherModule from 'other-module';`,
        },
        {
          name: 'Importing a different module that has a strict equal method is still valid',
          code: `import foo from 'something-that-is-not-assert';
               const val1 = 'val2';
               foo.strictEqual(val1, 'val2');`,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code and provides the correct error message', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'Errors when importing all exports as assert from node:assert',
          code: `import * as assert from 'node:assert';`,
          errors: [
            {
              message: 'Invalid form of strict assertion mode',
            },
          ],
          output: `import { strict as assert } from 'node:assert';`,
        },
        {
          name: 'Errors when importing assert from node:assert',
          code: `import assert from 'node:assert';`,
          errors: [
            {
              message: 'Invalid form of strict assertion mode',
            },
          ],
          output: `import { strict as assert } from 'node:assert';`,
        },
        {
          name: 'Errors when importing all exports as assert from node:assert with additional imports',
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
          name: 'Errors when importing assert from node:assert and using assertion methods',
          code: `import assert from 'node:assert';
               assert.strictEqual(value1, value2);`,
          errors: [
            {
              message: 'Invalid form of strict assertion mode',
            },
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               assert.equal(value1, value2);`,
        },
        {
          name: 'Errors when importing strict as assert from node:assert and using redundant strict assertion methods',
          code: `import { strict as assert } from 'node:assert';
               assert.strictEqual(value1, value2);`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               assert.equal(value1, value2);`,
        },
        {
          name: 'Errors when importing strict as assert from node:assert and using redundant deep strict assertion methods',
          code: `import { strict as assert } from 'node:assert';
               assert.deepStrictEqual(obj1, obj2);`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               assert.deepEqual(obj1, obj2);`,
        },
        {
          name: 'Errors when importing strict as assert from node:assert and using redundant not strict equal assertion method',
          code: `import { strict as assert } from 'node:assert';
               assert.notStrictEqual(value1, value2);`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               assert.notEqual(value1, value2);`,
        },
        {
          name: 'Errors when importing strict as assert from node:assert and using redundant not deep strict equal assertion methods',
          code: `import { strict as assert } from 'node:assert';
               assert.notDeepStrictEqual(obj1, obj2);`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               assert.notDeepEqual(obj1, obj2);`,
        },
        {
          name: 'Errors when importing strict as assert from node:assert and using redundant strict assertion method',
          code: `import { strict as assert } from 'node:assert';
               const val1 = 'val2';
               assert.strict(val1, 'val2');`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as assert } from 'node:assert';
               const val1 = 'val2';
               assert.equal(val1, 'val2');`,
        },
        {
          name: 'Errors when importing assert from node:assert/strict',
          code: `import assert from 'node:assert/strict';`,
          errors: [
            {
              message: 'Invalid form of strict assertion mode',
            },
          ],
          output: `import { strict as assert } from 'node:assert';`,
        },
        {
          name: 'Errors when importing strict as anything other than assert from node:assert',
          code: `import { strict as foo } from 'node:assert';
               const val1 = 'val2';
               foo.strictEqual(val1, 'val2');`,
          errors: [
            {
              message:
                'strict method not required when in strict assertion mode.',
            },
          ],
          output: `import { strict as foo } from 'node:assert';
               const val1 = 'val2';
               foo.equal(val1, 'val2');`,
        },
      ],
    });
  });
});
