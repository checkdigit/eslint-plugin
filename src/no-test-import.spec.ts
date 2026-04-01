// no-test-import.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, {
  NO_TEST_IMPORT,
  type NoTestImportRuleOptions,
  ruleId,
} from './no-test-import.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();
  const overwrittenConfigurationTester = createEslintRuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  });
  const overwrittenConfiguration: NoTestImportRuleOptions = {
    testFilePattern: '\\.test\\.xyz$',
  };

  it('validates good code', () => {
    ruleTester.run(`${ruleId} with default configuration`, rule, {
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
      invalid: [],
    });
  });

  it('errors on invalid code and provides the correct error message', () => {
    ruleTester.run(`${ruleId} with default configuration`, rule, {
      valid: [],
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

  it('validates good code with overwritten configuration', () => {
    overwrittenConfigurationTester.run(
      `${ruleId} with overwritten configuration`,
      rule,
      {
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
        invalid: [],
      },
    );
  });

  it('errors on invalid code with overwritten configuration and provides the correct error message', () => {
    overwrittenConfigurationTester.run(
      `${ruleId} with overwritten configuration`,
      rule,
      {
        valid: [],
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
      },
    );
  });
});
