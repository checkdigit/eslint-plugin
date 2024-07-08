// invalid-json-stringify.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { INVALID_JSON_STRINGIFY } from './invalid-json-stringify';
import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

describe('invalid-json-stringify', () => {
  new RuleTester({
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  }).run('invalid-json-stringify', rule, {
    valid: [
      {
        code: `console.log(error);`,
      },
      {
        code: `JSON.stringify(body);`,
      },
      {
        code: `JSON.parse(error);`,
      },
    ],
    invalid: [
      {
        code: `JSON.stringify(error);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
          },
        ],
      },
      {
        code: `JSON.stringify(error, null, 2);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
          },
        ],
      },
      {
        // eslint-disable-next-line no-template-curly-in-string
        code: 'console.log(`got an error: ${JSON.stringify(error)}`);',
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
          },
        ],
      },
      {
        code: `JSON.stringify(responseError);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
          },
        ],
      },
    ],
  });
});
