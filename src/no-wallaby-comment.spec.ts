// no-wallaby-comment.spec.ts

/*
 * Copyright (c) 2022-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */
import { RuleTester } from 'eslint';

import rule from './no-wallaby-comment';

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

describe('no-wallaby-comment', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('no-wallaby-comment', rule, {
    valid: [
      {
        code: LINE_ONE_NO_COMMENTS,
      },
      {
        code: LINE_TWO_NO_COMMENTS,
      },
      {
        code: LINE_SEVEN_WITH_COMMENTS,
      },
    ],
    invalid: [
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret.";// ? `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret.";// ?? `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret.";// ?. `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret.";// ??. `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret.";     // ?     `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `  // file.only    `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: ``,
      },
      {
        code: `// file.only   `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: ``,
      },
      {
        code: `//  file.skip   `,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: ``,
      },
      {
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
        code: LINE_THREE_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: '',
      },
      {
        code: LINE_FOUR_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: '',
      },
      {
        code: LINE_FIVE_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: '',
      },
      {
        code: LINE_SIX_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: LINE_SIX_WITH_COMMENTS_EXPECTED,
      },
      {
        code: LINE_EIGHT_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: LINE_EIGHT_WITH_COMMENTS_EXPECTED,
      },
      {
        code: LINE_NINE_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: LINE_NINE_WITH_COMMENTS_EXPECTED,
      },
      {
        code: LINE_TEN_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: LINE_TEN_WITH_COMMENTS_EXPECTED,
      },
      {
        code: LINE_11_WITH_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: LINE_11_WITH_COMMENTS_EXPECTED,
      },
    ],
  });
});
