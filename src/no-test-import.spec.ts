// no-test-import.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';
import rule, { NO_TEST_IMPORT, type NoTestImportRuleOptions } from './no-test-import.ts';

describe('no-test-import', () => {
  new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  }).run('no-test-import with default configuration', rule, {
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

  const overwrittenConfiguration: NoTestImportRuleOptions = { testFilePattern: '\\.test\\.xyz$' };
  new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  }).run('no-test-import with overwritten configuration', rule, {
    valid: [
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.test';`,
        options: [overwrittenConfiguration],
      },
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.spec';`,
        options: [overwrittenConfiguration],
      },
    ],
    invalid: [
      {
        filename: 'src/api/v1/message.ts',
        code: `import util from './util.test.xyz';`,
        options: [overwrittenConfiguration],
        errors: [
          {
            messageId: NO_TEST_IMPORT,
          },
        ],
      },
    ],
  });
});
