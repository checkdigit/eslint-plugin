// require-assert-message.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */
import rule, { ruleId } from './require-assert-message';
import createTester from './ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case with assert.ok and message',
      code: `import { strict as assert } from 'node:assert';
             assert.ok(statusCode === StatusCodes.OK, 'Failed to get data.');`,
    },
    {
      name: 'Valid case with assert.equal and message',
      code: `import { strict as assert } from 'node:assert';
             assert.equal('val1','val1', 'Both are different values');`,
    },
    {
      name: 'Valid case with assert.AssertionError',
      code: `if (error instanceof assert.AssertionError) {
                console.log("assertion error: " + error.message);
             }`,
    },
    {
      name: 'Valid case with assert.ok and message in spec file',
      code: `import { strict as assert } from 'node:assert';
             assert.ok(statusCode === StatusCodes.OK, 'Status code is not OK');`,
    },
    {
      name: 'Valid case with assert.deepEqual and message',
      code: `import { strict as assert } from 'node:assert';
             assert.deepEqual(object1, object2, 'Objects are not equal');`,
    },
    {
      name: 'Valid case with assert.doesNotMatch and message',
      code: `import { strict as assert } from 'node:assert';
             assert.doesNotMatch(test, /\\W/gu, 'Test string contains non-word characters');`,
    },
    {
      name: 'Valid case with assert.match and message',
      code: `import { strict as assert } from 'node:assert';
             assert.match(test, /\\W/gu, 'Test string does not contain non-word characters');`,
    },
    {
      name: 'Valid case with assert.doesNotReject and message',
      code: `import { strict as assert } from 'node:assert';
             assert.doesNotReject(
                async () => {
                  const result = await resolvePromise();
                },
                Error,
                'Promise was rejected'
             );`,
    },
    {
      name: 'Valid case with assert and message',
      code: `import { strict as assert } from 'node:assert';
             assert('val1', 'correct value');`,
    },
  ],
  invalid: [
    {
      name: 'Invalid case with assert and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert('val1');`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.deepEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.deepEqual(object1, object2);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.deepStrictEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.deepStrictEqual(object1, object2);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.doesNotMatch and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.doesNotMatch(test, /\\W/gu);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.doesNotReject and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.doesNotReject(
              async () => {
                const result = await resolvePromise();
              },
              Error
           );`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.doesNotThrow and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.doesNotThrow(() => { throw new Error('error'); }, Error);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.equal and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.equal('val1', 'val1');`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.fail and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.fail();`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.match and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.match(test, /\\W/gu);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.notDeepEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.notDeepEqual(object1, object2);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.notDeepStrictEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.notDeepStrictEqual(object1, object2);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.notEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.notEqual('val1', 'val2');`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.notStrictEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.notStrictEqual('val1', 'val2');`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.ok and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.ok(statusCode === StatusCodes.OK);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.rejects and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.rejects(
              async () => {
                throw new Error('error');
              },
              Error
           );`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.strictEqual and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.strictEqual('val1', 'val1');`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
    {
      name: 'Invalid case with assert.throws and missing message',
      code: `import { strict as assert } from 'node:assert';
           assert.throws(() => { throw new Error('error'); }, Error);`,
      errors: [{ messageId: 'MISSING_ASSERT_MESSAGE' }],
    },
  ],
});
