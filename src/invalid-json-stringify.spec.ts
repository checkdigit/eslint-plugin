// invalid-json-stringify.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './invalid-json-stringify';
import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  new RuleTester({
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  }).run(ruleId, rule, {
    valid: [`console.log(error);`, `JSON.stringify(body);`, `JSON.parse(error);`],
    invalid: [
      {
        code: `JSON.stringify(error);`,
        output: `String(error);`,
        errors: 1,
      },
      {
        code: `JSON.stringify(error, null, 2);`,
        output: `String(error);`,
        errors: 1,
      },
      {
        // eslint-disable-next-line no-template-curly-in-string
        code: 'console.log(`got an error: ${JSON.stringify(error)}`);',
        // eslint-disable-next-line no-template-curly-in-string
        output: 'console.log(`got an error: ${String(error)}`);',
        errors: 1,
      },
      {
        code: `JSON.stringify(responseError);`,
        output: `String(responseError);`,
        errors: 1,
      },
    ],
  });
});
