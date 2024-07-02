// no-test-import.ts

import type { Rule } from 'eslint';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/**
 *  this rule should be turned on with overrides for test files (e.g. *.test.ts, *.spec.ts) only
 */

export interface NoTestImportRuleOptions {
  testFilePattern?: string;
}
export const NO_TEST_IMPORT = 'NO_TEST_IMPORT';
const DEFAULT_TEST_FILE_PATTERN = '\\.(test|spec)(\\.\\w+)?$';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Importing test files is not allowed since it might lead to problems if the test files are removed from the build',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [NO_TEST_IMPORT]: `Importing test file "{{ importingFileName }}" matching pattern "{{ testFilePattern }}" is not allowed from: "{{ sourceFileName }}"`,
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as NoTestImportRuleOptions;
    const testFilePattern = options.testFilePattern ?? DEFAULT_TEST_FILE_PATTERN;
    const testFileRegexp = new RegExp(testFilePattern, 'u');

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value === 'string' && testFileRegexp.test(node.source.value)) {
          context.report({
            node,
            messageId: NO_TEST_IMPORT,
            data: {
              sourceFileName: context.filename,
              importingFileName: node.source.value,
              testFilePattern,
            },
          });
        }
      },
    };
  },
} as Rule.RuleModule;
