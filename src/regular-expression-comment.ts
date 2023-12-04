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
            const hasRegexComment = comments.find((comment) => {
              if (!comment.loc) {
                return false;
              }
              const regExp = /[a-zA-Z]/gu;
              const commentRegExp = /^(?:\/{2,}|\/\*+)/gu;
              const hasComment = regExp.test(comment.value.trim());
              const previousLineComment = context.sourceCode.getLines()[previousLine - 1];
              if (comment.type === 'Line' || comment.loc.start.line === comment.loc.end.line) {
                return (
                  (comment.loc.end.line === previousLine &&
                    previousLineComment !== undefined &&
                    commentRegExp.test(previousLineComment) &&
                    hasComment) ||
                  (comment.loc.end.line === regexLine && hasComment)
                );
              }
              return (
                (comment.loc.end.line === previousLine && hasComment) ||
                (comment.loc.end.line === regexLine && hasComment)
              );
            });

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
