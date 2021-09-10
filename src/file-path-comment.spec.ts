// file-path-comment.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './file-path-comment';

describe.only('file-path-comment', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('file-path-comment', rule, {
    valid: [
      {
        filename: 'src/world/hello.ts',
        code: `// world/hello.ts`,
      },
      {
        filename: 'src/hello.ts',
        code: `// hello.ts\n`,
      },
    ],
    invalid: [
      {
        filename: 'src/hello.ts',
        code: `// not-hello.ts`,
        errors: [{ message: 'first line is a comment but is not a path to the file' }],
        output: `// hello.ts`,
      },
      {
        filename: 'src/hello.ts',
        code: `//hello.ts\n`,
        errors: [{ message: 'first line is a comment but is not a path to the file' }],
        output: `// hello.ts\n`,
      },
      {
        filename: 'src/hello.ts',
        code: `/* not-hello.ts */`,
        errors: [{ message: 'first line cannot be a block comment' }],
        output: `// hello.ts\n\n/* not-hello.ts */`,
      },
      {
        filename: 'src/hello.ts',
        code: `const x = 123;`,
        errors: [{ message: 'first line is not a comment with the file path' }],
        output: `// hello.ts\n\nconst x = 123;`,
      },
      {
        filename: 'src/hello.ts',
        code: ``,
        errors: [{ message: 'first line is not a comment with the file path' }],
        output: `// hello.ts\n\n`,
      },
    ],
  });
});
