// invalid-json-stringify.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';
import rule, { INVALID_JSON_STRINGIFY, ruleId } from './invalid-json-stringify';

describe(ruleId, () => {
  new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  }).run(ruleId, rule, {
    valid: [`console.log(error);`, `JSON.stringify(body);`, `JSON.parse(error);`],
    invalid: [
      {
        code: `JSON.stringify(error);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
            suggestions: [
              {
                messageId: INVALID_JSON_STRINGIFY,
                output: 'String(error);',
              },
            ],
          },
        ],
      },
      {
        code: `JSON.stringify(error, null, 2);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
            suggestions: [
              {
                messageId: INVALID_JSON_STRINGIFY,
                output: 'String(error);',
              },
            ],
          },
        ],
      },
      {
        // eslint-disable-next-line no-template-curly-in-string
        code: 'console.log(`got an error: ${JSON.stringify(error)}`);',
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
            suggestions: [
              {
                messageId: INVALID_JSON_STRINGIFY,
                // eslint-disable-next-line no-template-curly-in-string
                output: 'console.log(`got an error: ${String(error)}`);',
              },
            ],
          },
        ],
      },
      {
        code: `JSON.stringify(responseError);`,
        errors: [
          {
            messageId: INVALID_JSON_STRINGIFY,
            suggestions: [
              {
                messageId: INVALID_JSON_STRINGIFY,
                output: 'String(responseError);',
              },
            ],
          },
        ],
      },
    ],
  });
});
