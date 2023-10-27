// no-wallaby-comment.ts

/*
 * Copyright (c) 2022-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects wallaby-specific temporary comments like // ? or // ?? or // ?. or // file.only or // file.skip and fix it',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const sourceLines = sourceCode.lines;

    sourceLines.forEach((line, lineNumber) => {
      const regex = /\s*(?:\/\/|<!--)\s*(?:\?{1,2}\.?|file\.(?:only|skip))\s*/gu;

      const parts = line.split(regex);
      if (parts.length > 1) {
        const newLine = parts.join('');

        context.report({
          loc: {
            line: lineNumber + 1,
            column: 0,
          },
          message: 'Remove wallaby-specific comments',
          fix: (fixer) =>
            fixer.replaceTextRange(
              [
                sourceCode.getIndexFromLoc({ line: lineNumber + 1, column: 0 }),
                sourceCode.getIndexFromLoc({ line: lineNumber + 1, column: line.length }),
              ],
              newLine,
            ),
        });
      }
    });
    return {};
  },
} as Rule.RuleModule;
