// require-assert-message-rejects-throws.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that error and message argument is always supplied to node:assert rejects,throws methods',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'assert' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'rejects' || callee.property.name === 'throws') &&
          node.arguments.length >= 1
        ) {
          const assertPredicate = node.arguments[1];
          if (
            assertPredicate === undefined ||
            (assertPredicate.type !== 'FunctionExpression' &&
              assertPredicate.type !== 'ArrowFunctionExpression' &&
              assertPredicate.type !== 'ObjectExpression' &&
              assertPredicate.type !== 'Identifier' &&
              assertPredicate.type === 'Literal' &&
              typeof assertPredicate.value !== 'object')
          ) {
            context.report({
              node,
              message: 'Second argument in {{method}} method should be of type AssertPredicate.',
              data: {
                method: callee.property.name,
              },
            });
          }
        }
      },
    };
  },
} as Rule.RuleModule;
