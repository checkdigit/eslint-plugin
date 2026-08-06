// no-serve-runtime.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import createTester from './ts-tester.test.ts';
import rule, { ruleId } from './no-serve-runtime.ts';

describe('no-serve-runtime', () => {
  it('works', () => {
    createTester().run(ruleId, rule, {
      valid: [
        {
          name: 'no error if no @checkdigit/serve-runtime is used',
          code: `import { strict as assert } from 'node:assert';`,
        },
      ],
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
