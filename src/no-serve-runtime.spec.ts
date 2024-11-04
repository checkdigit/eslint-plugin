// no-full-response.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from './ts-tester.test';
import rule, { ruleId } from './no-serve-runtime';

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
