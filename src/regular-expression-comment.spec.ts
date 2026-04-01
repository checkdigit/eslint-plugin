// regular-expression-comment.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './regular-expression-comment.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

const VALID_TEST_1 = `// This regular expression removes all non-alphanumeric characters.
const NOT_A_SECRET = /W/gu;`;

const VALID_TEST_2 = `const NOT_A_SECRET = /W/gu; // This regular expression removes all non-alphanumeric characters.`;
const VALID_TEST_3 = `/* This regular expression removes all non-alphanumeric characters. */
const NOT_A_SECRET = /W/gu;`;

const VALID_TEST_4 = `
/* This regular expression removes all non-alphanumeric characters. */ const NOT_A_SECRET = /W/gu;`;

const VALID_TEST_5 = `
/** 
** test 
**/
const testDate1 = test1.replaceAll(/\\W/gu, '');
const testDate2 = test2.replaceAll(/\\W/gu, ''); // test
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const VALID_TEST_6 = `
   // test
const testDate1 = test1.replaceAll(/\\W/gu, '');
const testDate2 = test2.replaceAll(/\\W/gu, ''); // test
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const VALID_TEST_7 = `
   /**  test
  **/
const testDate1 = test1.replaceAll(/\\W/gu, '');
const testDate2 = test2.replaceAll(/\\W/gu, '');    // test
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const VALID_TEST_8 = `
['', undefined].forEach((_lib) => {
  // this is a comment for the regex below
  assert.ok(/^[a-z]+$/u.test('hello'));
  // do nothing
});
`;

const VALID_TEST_9 = `
  // returns true if the string passed is valid
  const disallowedCharacters = /\\\\t+|\\\\n+|\\\\r+/gu;
`;

const VALID_TEST_10 = `
          /// returns true if the string passed is valid
  const disallowedCharacters = /\\\\t+|\\\\n+|\\\\r+/gu;
`;

const VALID_TEST_11 = `
const NOT_A_SECRET = "I'm not a secret, I think"; 
const NEVER_A_SECRET = /W/gu;
const NOT_SECRET = "I'm not a secret, I think";
`;

const INVALID_TEST_1 = `const UUID_REGEX = /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/gmu;`;

const INVALID_TEST_2 = `
const testRegex1 = /Test connection established.*TEST_20/gmsu;
const testRegex2 = /Error with Test connection. Exiting process.*TEST_20/gmsu;
`;

const INVALID_TEST_3 = `const testDate1 = /Test Count: [1-9]\\d*.*\\r\\nTest Count: [1-9]\\d*.*\\r\\nTest & Records Count: [1-9]\\d*.*/gmu;`;

const INVALID_TEST_4 = `
const testRegex1 = /Downloaded test file \\/1234567\\/test\\/download\\/test123\\/XYZ\\.XY\\.test123\\./gmu;
const testRegex2 = /error downloading test file.*test123/gmu;
`;

const INVALID_TEST_5 = `
const testRegex1 = /[1-9]\\d* test records processed between.*UNMATCHED: 0/gmu;
const testRegex2 = /successfully processed test1\\.test-1\\.test-file\\.test.*XYZ\\.XY\\.X123/gmu;
`;

const INVALID_TEST_6 = `
const testRegex1 = /Transferred file sftp:.*test-xy-z\\.testClients\\.xyz.*XYZ098/gmu;
const testRegex2 = /created test file for the new file TEST\\.123456789\\./gmu;
`;

const INVALID_TEST_7 = `const testRegex1 = /error processing x:test\\.test-xyz\\.test\\.xyz\\.abc/gmu;`;

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Regex with a comment describing what the regex is doing',
          code: VALID_TEST_1,
        },
        {
          name: 'Regex with a comment describing what the regex is doing on the same line',
          code: VALID_TEST_2,
        },
        {
          name: 'Regex with a block comment describing what the regex is doing',
          code: VALID_TEST_3,
        },
        {
          name: 'Regex with a block comment describing what the regex is doing on the same line',
          code: VALID_TEST_4,
        },
        {
          name: 'Multiple regexes with comments describing what the regexes are doing',
          code: VALID_TEST_5,
        },
        {
          name: 'Multiple regexes with comments describing what the regexes are doing with varying whitespace',
          code: VALID_TEST_6,
        },
        {
          name: 'Multiple regexes with comments describing what the regexes are doing with varying whitespace and comment types',
          code: VALID_TEST_7,
        },
        {
          name: 'Nested regex with a comment describing what the regex is doing',
          code: VALID_TEST_8,
        },
        {
          name: 'Regex with multiple escaped characters with a comment describing what the regex is doing',
          code: VALID_TEST_9,
        },
        {
          name: 'Regex with multiple escaped characters with a comment that has extra leading whitespace describing what the regex is doing',
          code: VALID_TEST_10,
        },
        {
          name: 'Strings that do not contain secrets',
          code: VALID_TEST_11,
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
          name: 'Missing comment for regular expression',
          code: INVALID_TEST_1,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Multiple regexes missing comments describing what the regexes are doing',
          code: INVALID_TEST_2,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Regex with multiple patterns missing a comment describing what the regex is doing',
          code: INVALID_TEST_3,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Two regexes separated by a newline missing comments describing what the regexes are doing',
          code: INVALID_TEST_4,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Two regexes separated by a newline missing comments describing what the regexes are doing with varying whitespace',
          code: INVALID_TEST_5,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Two regexes separated by a newline containing plaintext missing comments describing what the regexes are doing',
          code: INVALID_TEST_6,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
        {
          name: 'Regex containing plaintext, escaped characters and symbols missing a comment describing what the regex is doing',
          code: INVALID_TEST_7,
          errors: [
            {
              message: 'Missing comment for regular expression',
            },
          ],
        },
      ],
    });
  });
});
