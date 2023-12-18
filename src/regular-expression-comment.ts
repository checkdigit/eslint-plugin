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
    const lines = context.sourceCode.getLines();
    return {
      Literal(node) {
        if (node.loc && node.value instanceof RegExp) {
          const regularExpressionLine = node.loc.start.line;
          const previousLine = regularExpressionLine - 1;
          const previousLineComment = lines[previousLine - 1];
          const regularExpressionComment = comments.find((comment) => {
            if (!comment.loc) {
              return false;
            }
            const regularExpression = /[a-zA-Z]/gu;
            const commentRegularExpressionLine = /^\s*(?:\/{2,}|\/\*+)/gu;
            const hasComment = regularExpression.test(comment.value.trim());
            if (comment.type === 'Line' || comment.loc.start.line === comment.loc.end.line) {
              return (
                (comment.loc.end.line === previousLine &&
                  previousLineComment !== undefined &&
                  commentRegularExpressionLine.test(previousLineComment) &&
                  hasComment) ||
                (comment.loc.end.line === regularExpressionLine && hasComment)
              );
            }
            return (
              (comment.loc.end.line === previousLine && hasComment) ||
              (comment.loc.end.line === regularExpressionLine && hasComment)
            );
          });

          if (!regularExpressionComment) {
            context.report({
              node,
              message: 'Missing comment for regular expression',
            });
          }
        }
      },
    };
  },
} as Rule.RuleModule;
