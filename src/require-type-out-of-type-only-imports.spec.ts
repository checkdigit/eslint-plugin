// require-type-out-of-type-only-imports.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './require-type-out-of-type-only-imports.ts';
import { createTypescriptRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createTypescriptRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'correct import with one type specifier',
          code: `import type { TypeOne } from 'abc';`,
        },
        {
          name: 'correct import with one named type specifier',
          code: `import type { TypeOne as T1 } from 'abc';`,
        },
        {
          name: 'correct import with multiple type specifiers',
          code: `import type { TypeOne, TypeTwo } from 'abc';`,
        },
        {
          name: 'correct import with mixed type and value',
          code: `import { type TypeOne, ValueOne } from 'abc';`,
        },
        {
          name: 'correct import without import specifier',
          code: `import 'dotenv';`,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code, provides the correct error message and fixes the code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'one type specifier',
          code: `import { type TypeOne } from 'abc';`,
          output: `import type { TypeOne } from 'abc';`,
          errors: [{ messageId: 'moveTypeOutside' }],
        },
        {
          name: 'multiple type specifier',
          code: `import { type TypeOne, type TypeTwo, type TypeThree } from 'abc';`,
          output: `import type { TypeOne, TypeTwo, TypeThree } from 'abc';`,
          errors: [{ messageId: 'moveTypeOutside' }],
        },
        {
          name: 'both unnamed and named specifiers',
          code: `import { type TypeOne, type TypeTwo as T2 } from 'abc';`,
          output: `import type { TypeOne, TypeTwo as T2 } from 'abc';`,
          errors: [{ messageId: 'moveTypeOutside' }],
        },
      ],
    });
  });
});
