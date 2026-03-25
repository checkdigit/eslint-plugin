// no-serve-runtime.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, { ruleId } from './no-serve-runtime.ts';
import { createTypescriptRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createTypescriptRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'no error if no @checkdigit/serve-runtime is used',
          code: `import { strict as assert } from 'node:assert';`,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code and provides the correct error message', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'report error for the usage of @checkdigit/serve-runtime',
          code: `import type { Configuration } from '@checkdigit/serve-runtime';`,
          errors: [{ messageId: 'noServeRuntime' }],
        },
      ],
    });
  });
});
