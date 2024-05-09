// require-assert-message-rejects-throws.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

import rule from './require-assert-message-rejects-throws';

describe('require-assert-message-rejects-throws', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020, sourceType: 'module' } });
  ruleTester.run('require-assert-message-rejects-throws', rule, {
    valid: [
      {
        code: `import { strict as assert } from 'node:assert';
               assert.rejects(
                  async () => {
                    const result = await resolvePromise();
                    },
                  Error,
                  'Expected error message',
               );`,
        filename: 'src/require-assert-message-rejects-throws.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.throws(
                  async () => {
                    const result = await resolvePromise();
                    },
                  Error,
                  'Expected error message',
               );`,
        filename: 'src/require-assert-message-rejects-throws.ts',
      },
    ],
    invalid: [
      {
        code: `import { strict as assert } from 'node:assert';
               assert.rejects(
                  async () => {
                    const result = await resolvePromise();
                    },
                   Error,
               );`,
        errors: [{ message: 'Missing message argument in rejects method.' }],
        filename: 'src/require-assert-message-rejects-throws.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.throws(
                  async () => {
                    const result = await resolvePromise();
                    },
                   Error,
               );`,
        errors: [{ message: 'Missing message argument in throws method.' }],
        filename: 'src/require-assert-message-rejects-throws.ts',
      },
      {
        code: `import { strict as assert } from 'node:assert';
               assert.throws(() => new Date());`,
        errors: [{ message: 'Missing message argument in throws method.' }],
        filename: 'src/require-assert-message-rejects-throws.ts',
      },
    ],
  });
});
