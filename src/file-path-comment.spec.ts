// file-path-comment.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule, { ruleId } from './file-path-comment.ts';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      filename: 'src/world/hello.ts',
      code: `// world/hello.ts`,
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
    {
      filename: 'src/util.ts',
      code: `// eslint-disable-next-line...../no-util\nconst x = 123;`,
    },
  ],
  invalid: [
    {
      filename: 'src/hello.ts',
      code: `// not-hello.ts`,
      errors: [{ messageId: 'VALIDATE_FIRST_LINE_PATH' }],
      output: `// hello.ts`,
    },
    {
      filename: 'src/hello.ts',
      code: `//hello.ts\n`,
      errors: [{ messageId: 'VALIDATE_FIRST_LINE_PATH' }],
      output: `// hello.ts\n`,
    },
    {
      filename: 'src/hello.ts',
      code: `/* not-hello.ts */`,
      errors: [{ messageId: 'VALIDATE_FIRST_LINE_PATH' }],
      output: `// hello.ts\n\n/* not-hello.ts */`,
    },
    {
      filename: 'src/hello.ts',
      code: `const x = 123;`,
      errors: [{ messageId: 'VALIDATE_FIRST_LINE_PATH' }],
      output: `// hello.ts\n\nconst x = 123;`,
    },
    {
      filename: 'src/hello.ts',
      code: ``,
      errors: [{ messageId: 'VALIDATE_FIRST_LINE_PATH' }],
      output: `// hello.ts\n\n`,
    },
  ],
});
