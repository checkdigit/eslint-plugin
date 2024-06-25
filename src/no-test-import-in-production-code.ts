// no-test-import-in-production-code.ts

import type { Rule } from 'eslint';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export const NO_TEST_IMPORT_IN_PRODUCTION_CODE = 'NO_TEST_IMPORT_IN_PRODUCTION_CODE';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Importing test files in production code is not allowed since it can lead to problems once the test files are removed from the build',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [NO_TEST_IMPORT_IN_PRODUCTION_CODE]: `Importing test files in production code is not allowed`,
    },
  },
  create(context) {
    const testFilePattern = /\.(?<testFileSuffix>test|spec)(?<tsFileSuffix>\.ts)?$/u;

    return {
      ImportDeclaration(node) {
        const filename = context.filename;

        // skip test files, only production code should be checked
        if (filename.match(testFilePattern)) {
          return;
        }

        if (typeof node.source.value === 'string' && testFilePattern.test(node.source.value)) {
          context.report({
            node,
            messageId: NO_TEST_IMPORT_IN_PRODUCTION_CODE,
          });
        }
      },
    };
  },
} as Rule.RuleModule;
