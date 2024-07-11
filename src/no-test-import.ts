// no-test-import.ts

import type { Rule } from 'eslint';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/**
 *  this rule should be turned off for test files (e.g. *.test.ts, *.spec.ts)
 */

export interface NoTestImportRuleOptions {
  testFilePattern?: string;
}
const DEFAULT_OPTIONS = { testFilePattern: '\\.(test|spec)(\\.\\w+)?$' };
export const NO_TEST_IMPORT = 'NO_TEST_IMPORT';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Importing test files is not allowed since it might lead to problems if the test files are removed from the build',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    schema: [
      {
        type: 'object',
        properties: {
          testFilePattern: {
            description: 'Regular expression pattern to match test files',
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [NO_TEST_IMPORT]: `Importing test file "{{ importingFileName }}" matching pattern "{{ testFilePattern }}" is not allowed from: "{{ sourceFileName }}"`,
    },
  },
  create(context) {
    const options = { ...DEFAULT_OPTIONS, ...(context.options[0] as NoTestImportRuleOptions) };
    const testFileRegexp = new RegExp(options.testFilePattern, 'u');

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value === 'string' && testFileRegexp.test(node.source.value)) {
          context.report({
            node,
            messageId: NO_TEST_IMPORT,
            data: {
              sourceFileName: context.filename,
              importingFileName: node.source.value,
              testFilePattern: options.testFilePattern,
            },
          });
        }
      },
    };
  },
} as Rule.RuleModule;
