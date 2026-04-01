// require-assert-predicate-rejects-throws.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './require-assert-predicate-rejects-throws.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'The correct and expected thrown error message are validated',
          code: `import { strict as assert } from 'node:assert';
                assert.rejects(
                   async () => {
                     const result = await resolvePromise();
                     },
                   error => error.message === 'Expected error message',
                   'Expected error message',
                );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected thrown type error and message are validated',
          code: `import { strict as strictAssert } from 'node:assert';
                  strictAssert.rejects(
                  async () => {
                    throw new TypeError('Wrong value');
                  },
                  {
                    name: 'TypeError',
                    message: 'Wrong value',
                  },
                );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected thrown type error is returned using a callback and validated',
          code: `import { strict as assert } from 'node:assert';
                  assert.rejects(
                  async () => {
                    throw new TypeError('Wrong value');
                  },
                  (err) => {
                    assert.strictEqual(err.name, 'TypeError');
                    assert.strictEqual(err.message, 'Wrong value');
                    return true;
                  },
                );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected rejected promise is returned using a .then and .catch callbacks',
          code: `import { strict as assert } from 'node:assert';
                  assert.rejects(
                    Promise.reject(new Error('Wrong value')),
                    Error,
                  ).then(() => {
                      console.log('Test case passed: Promise rejects with Error');
                  }).catch((error) => {
                      console.error('Test case failed:', error.message);
                  });`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected thrown RangeError is returned and validates the type of error thrown using a callback as well as validating the error message returned',
          code: `import { strict as assert } from 'node:assert';
                assert.throws(
                   () => {
                      throw new RangeError('Out of range');
                   },
                   error => error instanceof RangeError && error.code === 'ERR_OUT_OF_RANGE',
                   'Expected error message',
                );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Asserts that there is an error if no error is thrown from the function being tested',
          code: `import { strict as assert } from 'node:assert';
                assert.throws(() => new Date(), (error) => {
                    return error instanceof Error && error.message === 'Expected error message';
                });`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected thrown type error full structure is validated using assert.throws',
          code: `import assert from 'node:assert/strict';
              const err = new TypeError('Wrong value');
              err.code = 404;
              err.foo = 'bar';
              err.info = {
                nested: true,
                baz: 'text',
              };
              err.reg = /abc/i;
              
              assert.throws(
                () => {
                  throw err;
                },
                {
                  name: 'TypeError',
                  message: 'Wrong value',
                  info: {
                    nested: true,
                    baz: 'text',
                  },
                },
              );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'The correct and expected thrown type error full structure is validated when callback contains comments using assert.throws',
          code: `import assert from 'node:assert/strict';
              const err = new TypeError('Wrong value');
              err.code = 404;
              err.foo = 'bar';
              err.info = {
                nested: true,
                baz: 'text',
              };
              err.reg = /abc/i;
              
              assert.throws(
              () => {
                throw err;
              },
              {
                // The \`name\` and \`message\` properties are strings and using regular
                // expressions on those will match against the string. If they fail, an
                // error is thrown.
                name: /^TypeError$/,
                message: /Wrong/,
                foo: 'bar',
                info: {
                  nested: true,
                  // It is not possible to use regular expressions for nested properties!
                  baz: 'text',
                },
                // The \`reg\` property contains a regular expression and only if the
                // validation object contains an identical regular expression, it is going
                // to pass.
                reg: /abc/i,
              },
            );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Matches errors by properties rather than identity',
          code: `import { strict as assert } from 'node:assert';
               assert.throws(
                  () => {
                    const otherErr = new Error('Not found');
                    for (const [key, value] of Object.entries(err)) {
                      otherErr[key] = value;
                    }
                    throw otherErr;
                  },
                  err,
               );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Expected matches with regular expression',
          code: `import { strict as assert } from 'node:assert';
               assert.throws(
                () => {
                  throw new Error('Wrong value');
                },
                /^Error: Wrong value$/,
              );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Expected matches using an assert and regular expression in the callback',
          code: `import { strict as assert } from 'node:assert';
               assert.throws(
                  () => {
                    throw new Error('Wrong value');
                  },
                  (err) => {
                    assert(err instanceof Error);
                    assert(/value/.test(err));
                    return true;
                  },
                  'unexpected error',
               );`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Assert.rejects is valid when using .then and .catch callback to handle error message validation',
          code: `import { strict as assert } from 'node:assert';
               assert.rejects(
                Promise.reject(new Error('Wrong value')),
                Error
              ).then(() => {
                // This block will not be executed because the assertion failed
                // You can optionally add some assertions here if needed
              }).catch((error) => {
                // This block will be executed if the assertion fails
                console.error('Assertion failed:', error);
                // You can handle the error or add additional assertions here
              });`,
          filename: 'src/require-assert-predicate-rejects-throws.ts',
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
          name: 'Does not allow asserting an error that was not thrown',
          code: `import { strict as assert } from 'node:assert';
               assert.throws(throwingSecond, 'Second');`,
          errors: [
            {
              message:
                'Second argument in throws method should be of type AssertPredicate.',
            },
          ],
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Does not allow a function that does not throw an error',
          code: `import { strict as anyAssert } from 'node:assert';
               anyAssert.rejects(() => new Date(), 'Test Error');`,
          errors: [
            {
              message:
                'Second argument in rejects method should be of type AssertPredicate.',
            },
          ],
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
        {
          name: 'Reject does not accept a non reject error',
          code: `import { strict as assert } from 'node:assert';
               assert.rejects(async () => {
                throw new TypeError('Wrong value');
              });`,
          errors: [
            {
              message:
                'Second argument in rejects method should be of type AssertPredicate.',
            },
          ],
          filename: 'src/require-assert-predicate-rejects-throws.ts',
        },
      ],
    });
  });
});
