// fixture/no-duplicated-imports.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-duplicated-imports';
import { RuleTester } from '@typescript-eslint/rule-tester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: `${process.cwd()}/ts-init`,
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'distinct import statement - type',
      code: `import type { TypeOne } from 'abc';`,
    },
    {
      name: 'distinct import statement - value',
      code: `import { ValueOne } from 'abc';`,
    },
    {
      name: 'distinct import statement - mix of type and value',
      code: `import { type TypeOne, ValueOne } from 'abc';`,
    },
  ],
  invalid: [
    {
      name: 'duplicated import from should be merged - values',
      code: `import { ValueOne } from 'abc';\nimport { ValueTwo } from 'abc';\n`,
      output: `import { ValueOne, ValueTwo } from 'abc';\n`,
      errors: [{ messageId: 'mergeDuplicatedImports' }],
    },
    {
      name: 'duplicated import from should be merged - types',
      code: `import type { TypeOne } from 'abc';\nimport type { TypeTwo } from 'abc';\n`,
      output: `import type { TypeOne, TypeTwo } from 'abc';\n`,
      errors: [{ messageId: 'mergeDuplicatedImports' }],
    },
    {
      name: 'duplicated import from should be merged - mix of type and value',
      code: `import type { TypeOne } from 'abc';\nimport { ValueOne } from 'abc';\n`,
      output: `import { type TypeOne, ValueOne } from 'abc';\n`,
      errors: [{ messageId: 'mergeDuplicatedImports' }],
    },
    {
      name: 'works with named imports',
      code: `import type { TypeOne as T1 } from 'abc';\nimport { ValueOne as V1 } from 'abc';\n`,
      output: `import { type TypeOne as T1, ValueOne as V1 } from 'abc';\n`,
      errors: [{ messageId: 'mergeDuplicatedImports' }],
    },
    {
      name: 'works with default import',
      code: `import type { TypeOne as T1 } from 'abc';\nimport { ValueOne as V1 } from 'abc';\nimport abc from 'abc';\n`,
      output: `import abc, { type TypeOne as T1, ValueOne as V1 } from 'abc';\n`,
      errors: [{ messageId: 'mergeDuplicatedImports' }],
    },
  ],
});
