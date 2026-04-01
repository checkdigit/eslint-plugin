// no-wallaby-comment.spec.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './no-wallaby-comment.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

const LINE_ONE_NO_COMMENTS = `const NOT_A_SECRET = "A template that isn't a secret.";`;
const LINE_TWO_NO_COMMENTS = `/*
* This is a comment
*/`;

const LINE_ONE_WITH_MULTIPLE_COMMENTS = `// file.only 
const NOT_A_SECRET = "A template that isn't a secret.";
const NOT_SECRET = "A template that isn't a secret.";// ??.
const TEST = "this isn't secret";// ?
const SECRET = "A template that is a secret.";// ??
`;

const LINE_ONE_WITH_MULTIPLE_COMMENTS_EXPECTED = `
const NOT_A_SECRET = "A template that isn't a secret.";
const NOT_SECRET = "A template that isn't a secret.";
const TEST = "this isn't secret";
const SECRET = "A template that is a secret.";
`;

const LINE_TWO_WITH_MULTIPLE_COMMENTS = `// file.only 
const NOT_A_SECRET = "A template that isn't a secret";
        const NOT_SECRET = "A template that isn't a secret.";
        const TEST = "this isn't secret";// ?
        const TEST_DOT = "this isn't secret";// ?.
        const SECRET = "A template that is a secret.";// ??
const TEST_LINE = "test template";
`;

const LINE_TWO_WITH_MULTIPLE_COMMENTS_EXPECTED = `
const NOT_A_SECRET = "A template that isn't a secret";
        const NOT_SECRET = "A template that isn't a secret.";
        const TEST = "this isn't secret";
        const TEST_DOT = "this isn't secret";
        const SECRET = "A template that is a secret.";
const TEST_LINE = "test template";
`;

const LINE_THREE_WITH_COMMENTS = `//       file.only`;
const LINE_FOUR_WITH_COMMENTS = `/* file.only    */`;
const LINE_FIVE_WITH_COMMENTS = `/*
* file.only
*/`;

const LINE_SIX_WITH_COMMENTS = `/*
* This is first comment
* This is second comment
* file.only
* This is third comment
* This is fourth comment
*/`;

const LINE_SIX_WITH_COMMENTS_EXPECTED = `/*
* This is first comment
* This is second comment
* This is third comment
* This is fourth comment
*/`;

const LINE_SEVEN_WITH_COMMENTS = `
/*
 * some other comment
 */
`;

const LINE_EIGHT_WITH_COMMENTS = `
/*
 * This is a test comment
 */
 
 /*
 * some other comment
 * file.only
*/
`;

const LINE_EIGHT_WITH_COMMENTS_EXPECTED = `
/*
 * This is a test comment
 */
 
 /*
 * some other comment
 */
`;

const LINE_NINE_WITH_COMMENTS = `
// test.ts

/*
 * This is a test comment
 */
 
 /*
 * some other comment
 * file.only
 */
 
 /*
 * This is a test comment
 * some other new comment
 */
`;

const LINE_NINE_WITH_COMMENTS_EXPECTED = `
// test.ts

/*
 * This is a test comment
 */
 
 /*
 * some other comment
  */
 
 /*
 * This is a test comment
 * some other new comment
 */
`;

const LINE_TEN_WITH_COMMENTS = `
// test.ts

/*
 * This is a test comment
 */
 
 /*
 * some other comment
 * file.skip
 * some other comment
 */
`;

const LINE_TEN_WITH_COMMENTS_EXPECTED = `
// test.ts

/*
 * This is a test comment
 */
 
 /*
 * some other comment
  * some other comment
 */
`;

const LINE_11_WITH_COMMENTS = `
// test.ts

/**
 ** This is a test comment
 **/
 
 /**
 ** some other comment
 ** file.only
 ** some other comment
 **/
`;

const LINE_11_WITH_COMMENTS_EXPECTED = `
// test.ts

/**
 ** This is a test comment
 **/
 
 /**
 ** some other comment
  ** some other comment
 **/
`;

const LINE_12_WITH_COMMENTS = `
/**
 * For some reason (bug ?) test ??,
 * or does not handle ??.,
 * (bug ?)
 *
 * ?
 * ??
 * ?.
 *
 * Created an issue:
 */
`;

const LINE_13_WITH_COMMENTS = `// test the comment`;
const LINE_14_WITH_COMMENTS = `// test the comment ?  line ?? (bug?) (bug ?) ??. ?.`;
const LINE_15_WITH_COMMENTS = `const NOT_A_SECRET = "A template that isn't a secret"; // testing with ? here and ? ??.there`;
const LINE_16_WITH_COMMENTS = `const TEST = "this isn't secret"; // testing with ? here and there ??.`;
const LINE_17_WITH_COMMENTS = `
const NOT_A_SECRET = "A template that isn't a secret"; // test the comment
const TEST = "this isn't secret"; // testing with ? here and there ??.
`;

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Line one no comments',
          code: LINE_ONE_NO_COMMENTS,
        },
        {
          name: 'Line two no comments',
          code: LINE_TWO_NO_COMMENTS,
        },
        {
          name: 'Line seven with comments',
          code: LINE_SEVEN_WITH_COMMENTS,
        },
        {
          name: 'Line 12 with comments',
          code: LINE_12_WITH_COMMENTS,
        },
        {
          name: 'Line 13 with comments',
          code: LINE_13_WITH_COMMENTS,
        },
        {
          name: 'Line 14 with comments',
          code: LINE_14_WITH_COMMENTS,
        },
        {
          name: 'Line 15 with comments',
          code: LINE_15_WITH_COMMENTS,
        },
        {
          name: 'Line 16 with comments',
          code: LINE_16_WITH_COMMENTS,
        },
        {
          name: 'Line 17 with comments',
          code: LINE_17_WITH_COMMENTS,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code, provides the correct error message and correctly fixes the code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'Errors on a wallaby comment with no whitespace before wallaby comment',
          code: `const NOT_A_SECRET = "A template that isn't a secret.";// ? `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
        },
        {
          name: 'Errors on a wallaby comment with no whitespace before wallaby comment and two question marks',
          code: `const NOT_A_SECRET = "A template that isn't a secret.";// ?? `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
        },
        {
          name: 'Errors on a wallaby comment with no whitespace before wallaby comment and ending with a period',
          code: `const NOT_A_SECRET = "A template that isn't a secret.";// ?. `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
        },
        {
          name: 'Errors on wallaby comment with no whitespace before wallaby comment and ending with two question marks and a period',
          code: `const NOT_A_SECRET = "A template that isn't a secret.";// ??. `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
        },
        {
          name: 'Errors on a wallaby comment with whitespace before wallaby comment',
          code: `const NOT_A_SECRET = "A template that isn't a secret.";     // ?     `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
        },
        {
          name: 'Errors on a file.only that has whitespace prepended and appended to it',
          code: `  // file.only    `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: ``,
        },
        {
          name: 'Errors on a file.only that has whitespace appended to it',
          code: `// file.only   `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: ``,
        },
        {
          name: 'Errors on a file.skip that has whitespace appended to it',
          code: `//  file.skip   `,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: ``,
        },
        {
          name: 'Line one with multiple wallaby comments',
          code: LINE_ONE_WITH_MULTIPLE_COMMENTS,
          errors: [
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
          ],
          output: LINE_ONE_WITH_MULTIPLE_COMMENTS_EXPECTED,
        },
        {
          name: 'Line two with multiple wallaby comments',
          code: LINE_TWO_WITH_MULTIPLE_COMMENTS,
          errors: [
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
            { message: 'Remove wallaby-specific comments' },
          ],
          output: LINE_TWO_WITH_MULTIPLE_COMMENTS_EXPECTED,
        },
        {
          name: 'Line three with comments',
          code: LINE_THREE_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: '',
        },
        {
          name: 'Line four with comments',
          code: LINE_FOUR_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: '',
        },
        {
          name: 'Line five with comments',
          code: LINE_FIVE_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: '',
        },
        {
          name: 'Line six with comments',
          code: LINE_SIX_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: LINE_SIX_WITH_COMMENTS_EXPECTED,
        },
        {
          name: 'Line eight with comments',
          code: LINE_EIGHT_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: LINE_EIGHT_WITH_COMMENTS_EXPECTED,
        },
        {
          name: 'Line nine with comments',
          code: LINE_NINE_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: LINE_NINE_WITH_COMMENTS_EXPECTED,
        },
        {
          name: 'Line ten with comments',
          code: LINE_TEN_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: LINE_TEN_WITH_COMMENTS_EXPECTED,
        },
        {
          name: 'Line eleven with comments',
          code: LINE_11_WITH_COMMENTS,
          errors: [{ message: 'Remove wallaby-specific comments' }],
          output: LINE_11_WITH_COMMENTS_EXPECTED,
        },
      ],
    });
  });
});
