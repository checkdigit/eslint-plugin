// no-test-import.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { NO_TEST_IMPORT } from './no-test-import';
import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

describe('no-test-import', () => {
  const ruleTester = new RuleTester({
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  });

  ruleTester.run('no-test-import-in-production-code', rule, {
    valid: [
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util';`,
      },
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.ts';`,
      },
      {
        filename: 'src/api/v1/message.test.ts',
        code: `import util from './util';`,
      },
      {
        filename: 'src/api/v1/message.test.ts',
        code: `import util from './util.ts';`,
      },
      {
        filename: 'src/api/v1/message.spec.ts',
        code: `import util from './util';`,
      },
      {
        filename: 'src/api/v1/message.spec.ts',
        code: `import util from './util.ts';`,
      },
    ],
    invalid: [
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.spec';`,
        errors: [
          {
            messageId: NO_TEST_IMPORT,
          },
        ],
      },
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.spec.ts';`,
        errors: [
          {
            messageId: NO_TEST_IMPORT,
          },
        ],
      },
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.test';`,
        errors: [
          {
            messageId: NO_TEST_IMPORT,
          },
        ],
      },
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.test.ts';`,
        errors: [
          {
            messageId: NO_TEST_IMPORT,
          },
        ],
      },
    ],
  });
});
