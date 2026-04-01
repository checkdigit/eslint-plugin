// file-path-comment.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import { Linter } from 'eslint';

import rule, { ruleId } from './file-path-comment.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const configuration: Linter.Config = {
    languageOptions: { parserOptions: { ecmaVersion: 2020 } },
  };
  const ruleTester = createEslintRuleTester(configuration);

  it('valid code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Valid path comment',
          filename: 'src/world/hello.ts',
          code: `// world/hello.ts`,
          languageOptions: {
            parserOptions: {
              project: './tsconfig.json',
            },
          },
        },
        {
          name: 'Valid path comment under src directory',
          filename: 'src/hello.ts',
          code: `// hello.ts\n`,
        },
        {
          name: 'Valid path comment for file in root directory',
          filename: 'hello.ts',
          code: `// whatever does not matter\n`,
        },
        {
          name: 'Valid path comment for file in root directory',
          filename: 'source/hello.ts',
          code: `// whatever does not matter\n`,
        },
      ],
      invalid: [],
    });
  });

  it('invalid code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'First line is a comment but does not match the file path',
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
          name: 'Not a valid path comment since there is no whitespace after //',
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
          name: 'First line is a block comment',
          filename: 'src/hello.ts',
          code: `/* not-hello.ts */`,
          errors: [{ message: 'first line cannot be a block comment' }],
          output: `// hello.ts\n\n/* not-hello.ts */`,
        },
        {
          name: 'First line is not a path comment',
          filename: 'src/hello.ts',
          code: `const x = 123;`,
          errors: [
            { message: 'first line is not a comment with the file path' },
          ],
          output: `// hello.ts\n\nconst x = 123;`,
        },
        {
          name: 'Empty file with no path comment',
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
