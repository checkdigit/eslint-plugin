// no-enum.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-enum';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  const ruleTester = new RuleTester();
  ruleTester.run('no-side-effects', rule, {
    valid: [
      {
        code: `const status = { SUCCESS: 'success', FAILURE: 'failure' }; type Status = 'success' | 'failure';`,
      },
    ],
    invalid: [
      {
        code: `enum Status { SUCCESS = 'success', FAILURE = 'failure' };`,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
      {
        code: `enum Days { MONDAY = 'Monday', TUESDAY = 'Tuesday', WEDNESDAY = 'Wednesday' };`,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
    ],
  });
});
