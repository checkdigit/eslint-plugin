// regular-expression-comment.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require comments for regular expressions before or on the same line',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
  },
  create(context) {
    const comments = context.sourceCode.getAllComments();
    return {
      Literal(node) {
        if (node.value instanceof RegExp) {
          const regexLine = node.loc?.start.line;
          if (regexLine) {
            const previousLine = regexLine - 1;

            const hasRegexComment = comments.find(
              (comment) => comment.loc?.start.line === previousLine || comment.loc?.start.line === regexLine,
            );

            if (!hasRegexComment) {
              context.report({
                node,
                message: 'Missing comment for regular expression',
              });
            }
          }
        }
      },
    };
  },
} as Rule.RuleModule;
