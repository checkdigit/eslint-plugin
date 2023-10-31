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
    return {
      Literal(node) {
        if (node.value instanceof RegExp) {
          const regexLine = node.loc?.start.line;
          if (regexLine) {
            const previousLine = regexLine - 1;
            const hasRegexComment =
              context.sourceCode.getAllComments().some((comment) => comment.loc?.start.line === previousLine) ||
              context.sourceCode
                .getAllComments()
                .some((comment) => comment.loc && comment.loc.start.line === regexLine);
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
