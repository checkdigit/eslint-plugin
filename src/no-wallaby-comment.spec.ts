// no-wallaby-comment.spec.ts

/*
 * Copyright (c) 2022-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */
import { RuleTester } from 'eslint';

import rule from './no-wallaby-comment';

const LINE_WITH_NO_COMMENTS = `const NOT_A_SECRET = "A template that isn't a secret.";`;

const LINE_WITH_MULTIPLE_COMMENTS = `// file.only const NOT_A_SECRET = "A template that isn't a secret."; // ?. // ?? // ? // file.skip`;

describe('no-wallaby-comment', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('no-wallaby-comment', rule, {
    valid: [
      {
        code: LINE_WITH_NO_COMMENTS,
      },
    ],
    invalid: [
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret."; // ?`,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret."; // ??`,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `const NOT_A_SECRET = "A template that isn't a secret."; // ?.`,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `// file.only const NOT_A_SECRET = "A template that isn't a secret.";`,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `// file.skip const NOT_A_SECRET = "A template that isn't a secret.";`,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
      {
        code: `// file.only const NOT_A_SECRET = "A template that isn't a secret.";
        const NOT_SECRET = "A template that isn't a secret.";
        const test = "this isn't secret"; // ?`,
        errors: [{ message: 'Remove wallaby-specific comments' }, { message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";
        const NOT_SECRET = "A template that isn't a secret.";
        const test = "this isn't secret";`,
      },
      {
        code: `// file.only const NOT_A_SECRET = "A template that isn't a secret.";
        const NOT_SECRET = "A template that isn't a secret.";
        const test = "this isn't secret"; // ?
        const SECRET = "A template that isn't a secret."; // ??`,
        errors: [
          { message: 'Remove wallaby-specific comments' },
          { message: 'Remove wallaby-specific comments' },
          { message: 'Remove wallaby-specific comments' },
        ],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";
        const NOT_SECRET = "A template that isn't a secret.";
        const test = "this isn't secret";
        const SECRET = "A template that isn't a secret.";`,
      },
      {
        code: LINE_WITH_MULTIPLE_COMMENTS,
        errors: [{ message: 'Remove wallaby-specific comments' }],
        output: `const NOT_A_SECRET = "A template that isn't a secret.";`,
      },
    ],
  });
});
