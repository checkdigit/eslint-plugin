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
        'Detects wallaby-specific temporary comments like // ? or // ?? or // ?. or // ??. or // file.only or // file.skip and fix it',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const sourceLines = sourceCode.getLines();

    sourceLines.forEach((line, lineNumber) => {
      const regex = /\s*(?:\/\/|<!--)\s*(?<comment>\?{1,2}\.?\s*|file\.(?:only|skip))\s*/gu;

      let match;
      while ((match = regex.exec(line)) !== null) {
        const commentStart = match.index;
        const start = sourceCode.getIndexFromLoc({ line: lineNumber + 1, column: commentStart });
        const end = sourceCode.getIndexFromLoc({ line: lineNumber + 1, column: commentStart + match[0].length });
        context.report({
          loc: {
            line: lineNumber + 1,
            column: commentStart,
          },
          message: 'Remove wallaby-specific comments',
          fix: (fixer) => fixer.removeRange([start, end]),
        });
      }
    });
    return {};
  },
} as Rule.RuleModule;
