// require-assert-message.spec.ts

/*
 * Copyright (c) 2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './require-assert-message';

describe('no-uuid', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020, sourceType: 'module' } });
  ruleTester.run('require-assert-message', rule, {
    valid: [
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.ok(statusCode === StatusCodes.OK, 'Failed to get data.');`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.equal('val1','val1', 'Both are different values');`,
      },
      {
        code: `if (error instanceof assert.AssertionError) {
                          log("assertion error: " + error.message);
                        }`,
      },
      {
        code: `import { strict as assert } from 'node:assert';
                      try {
                          const result = null;
                          assert.ifError(result);
                      } catch (error) {
                            throw new Error('Test case: Expected an error');
                      }`,
      },
    ],
    invalid: [
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.equal('val1','val1');`,
        errors: [{ message: 'Missing message argument in equal() method.' }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.ok(statusCode === StatusCodes.OK);`,
        errors: [{ message: 'Missing message argument in ok() method.' }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.deepEqual(object1, object2);`,
        errors: [{ message: 'Missing message argument in deepEqual() method.' }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.doesNotMatch(test, /\\W/gu);`,
        errors: [{ message: 'Missing message argument in doesNotMatch() method.' }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.match(test, /\\W/gu);`,
        errors: [{ message: 'Missing message argument in match() method.' }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                       assert.doesNotReject(
                          async () => {
                            const result = await resolvePromise();
                          },
                          Error,
                       );`,
        errors: [{ message: 'Missing message argument in doesNotReject() method.' }],
      },
    ],
  });
});
