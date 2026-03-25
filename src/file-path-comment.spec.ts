// file-path-comment.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import { Linter } from 'eslint';

import rule from './file-path-comment.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe('file-path-comment', () => {
  const configuration: Linter.Config = {
    languageOptions: { parserOptions: { ecmaVersion: 2020 } },
  };
  const ruleTester = createEslintRuleTester(configuration);

  it('valid code', () => {
    ruleTester.run('file-path-comment', rule, {
      valid: [
        {
          filename: 'src/world/hello.ts',
          code: `// world/hello.ts`,
          languageOptions: {
            parserOptions: {
              project: './tsconfig.json',
            },
          },
        },
        {
          filename: 'src/hello.ts',
          code: `// hello.ts\n`,
        },
        {
          filename: 'hello.ts',
          code: `// whatever does not matter\n`,
        },
        {
          filename: 'source/hello.ts',
          code: `// whatever does not matter\n`,
        },
      ],
      invalid: [],
    });
  });

  it('invalid code', () => {
    ruleTester.run('file-path-comment', rule, {
      valid: [],
      invalid: [
        {
          filename: 'src/hello.ts',
          code: `// not-hello.ts`,
          errors: [
            {
              message: 'first line is a comment but is not a path to the file',
            },
          ],
          output: `// hello.ts`,
        },
        {
          filename: 'src/hello.ts',
          code: `//hello.ts\n`,
          errors: [
            {
              message: 'first line is a comment but is not a path to the file',
            },
          ],
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
          errors: [
            { message: 'first line is not a comment with the file path' },
          ],
          output: `// hello.ts\n\nconst x = 123;`,
        },
        {
          filename: 'src/hello.ts',
          code: ``,
          errors: [
            { message: 'first line is not a comment with the file path' },
          ],
          output: `// hello.ts\n\n`,
        },
      ],
    });
  });
});
