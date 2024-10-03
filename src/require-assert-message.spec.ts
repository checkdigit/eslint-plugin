// require-assert-message.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from '@jest/globals';

import rule, { ruleId } from './require-assert-message';

describe(ruleId, () => {
  const ruleTester = new RuleTester();
  ruleTester.run(ruleId, rule, {
    valid: [
      {
        code: `import { strict as assert } from 'node:assert';
               assert.ok(statusCode === StatusCodes.OK, 'Failed to get data.');`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.equal('val1','val1', 'Both are different values');`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `if (error instanceof assert.AssertionError) {
                  console.log("assertion error: " + error.message);
               }`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
                 try {
                     const result = null;
                     assert.ifError(result);
                 } catch (error) {
                      throw new Error('Test case: Expected an error');
                 }`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.ok(statusCode === StatusCodes.OK, 'Status code is not OK');`,
        filename: 'src/require-assert-message.spec.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.deepEqual(object1, object2, 'Objects are not equal');`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.doesNotMatch(test, /\\W/gu, 'Test string contains non-word characters');`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.match(test, /\\W/gu, 'Test string does not contain non-word characters');`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.doesNotReject(
                  async () => {
                    const result = await resolvePromise();
                  },
                  Error,
                  'Promise was rejected'
               );`,
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert('val1', 'correct value');`,
        filename: 'src/require-assert-message.ts',
      },
    ],
    invalid: [
      {
        code: `import { strict as assert } from 'node:assert';
               assert.equal('val1','val1');`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.ok(statusCode === StatusCodes.OK);`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.deepEqual(object1, object2);`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.doesNotMatch(test, /\\W/gu);`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.match(test, /\\W/gu);`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.doesNotReject(
                  async () => {
                    const result = await resolvePromise();
                  },
                  Error
               );`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert('val1');`,
        errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
        filename: 'src/require-assert-message.ts',
      },
    ],
  });
});
