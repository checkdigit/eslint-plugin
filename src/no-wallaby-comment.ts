// no-wallaby-comment.ts

/*
 * Copyright (c) 2022-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

function removeComments(input: string) {
  const commentPattern = /\/\/\s*(?<comment>\?{1,2}\.?|file\.only)/gu;
  return input.replaceAll(commentPattern, '').trim();
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects wallaby-specific temporary comments like // ? or // ?? or // ?. or // file.only and fix it',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const modifiedCode = removeComments(sourceCode.text);

    if (sourceCode.text !== modifiedCode) {
      context.report({
        loc: { line: 1, column: 0 },
        message: 'Remove wallaby-specific comments',
        fix: (fixer) => fixer.replaceTextRange([0, sourceCode.text.length], modifiedCode),
      });
    }

    return {};
  },
} as Rule.RuleModule;
