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
const testDate2 = test2.replaceAll(/\\W/gu, ''); // test
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_1 = `
const NOT_A_SECRET = "I'm not a secret, I think"; 
const NEVER_A_SECRET = /W/gu;
const NOT_SECRET = "I'm not a secret, I think";
`;

const INVALID_TEST_2 = `const UUID_REGEX = /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/gmu;`;

const INVALID_TEST_3 = `
/** 
**/
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_4 = `
//
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_5 = `
// test1
const testDate1 = test1.replaceAll(/\\W/gu, ''); // test2
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_6 = `
// test1
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_7 = `
// test1
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, '');
const testNewDate = testDate.replaceAll(/\\W/gu, ''); // test2
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_8 = `
// test1
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, '');
const testNewDate = testDate.replaceAll(/\\W/gu, ''); // 
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_9 = `
/**
**/
const testDate1 = test1.replaceAll(/\\W/gu, ''); 
const testDate2 = test2.replaceAll(/\\W/gu, ''); /** test **/
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_10 = `
/** 
**/
const testDate1 = test1.replaceAll(/\\W/gu, ''); /**  */
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_11 = `
/** 
**/
const testDate1 = test1.replaceAll(/\\W/gu, ''); 
/**  */
const testDate2 = test2.replaceAll(/\\W/gu, '');
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
`;

const INVALID_TEST_12 = `
/** 
**/
const testDate1 = test1.replaceAll(/\\W/gu, ''); //
const testDate2 = test2.replaceAll(/\\W/gu, ''); // 
const fileName = \`TEST_testDate1_testDate2}_fileId.txt\`;
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
      {
        code: VALID_TEST_5,
      },
      {
        code: VALID_TEST_6,
      },
      {
        code: VALID_TEST_7,
      },
    ],
    invalid: [
      {
        code: INVALID_TEST_1,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_2,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_3,
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
        code: INVALID_TEST_5,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_6,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_7,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_8,
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
        code: INVALID_TEST_9,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
      {
        code: INVALID_TEST_10,
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
        code: INVALID_TEST_11,
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
        code: INVALID_TEST_12,
        errors: [
          {
            message: 'Missing comment for regular expression',
          },
          {
            message: 'Missing comment for regular expression',
          },
        ],
      },
    ],
  });
});
