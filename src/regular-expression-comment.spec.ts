// regular-expression-comment.spec.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './regular-expression-comment';

const VALID_TEST_1 = `// This regular expression removes all non-alphanumeric characters.
const NOT_A_SECRET = /W/gu;`;

const VALID_TEST_2 = `const NOT_A_SECRET = /W/gu; // This regular expression removes all non-alphanumeric characters.`;
const VALID_TEST_3 = `/* This regular expression removes all non-alphanumeric characters. */
const NOT_A_SECRET = /W/gu;`;

const VALID_TEST_4 = `
/* This regular expression removes all non-alphanumeric characters. */ const NOT_A_SECRET = /W/gu;`;

const INVALID_TEST = `
const NOT_A_SECRET = "I'm not a secret, I think"; 
const NEVER_A_SECRET = /W/gu;
const NOT_SECRET = "I'm not a secret, I think";
`;

describe('regular-expression-comment', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });
  ruleTester.run('regular-expression-comment', rule, {
    valid: [
      {
        code: VALID_TEST_1,
      },
      {
        code: VALID_TEST_2,
      },
      {
        code: VALID_TEST_3,
      },
      {
        code: VALID_TEST_4,
      },
    ],
    invalid: [
      {
        code: INVALID_TEST,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
    ],
  });
});
