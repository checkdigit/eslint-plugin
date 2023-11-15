// require-assert-message.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that message argument to always be supplied to node:assert methods',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        console.log(callee);
        const isSpec = context.filename.includes('spec');
        if (!isSpec && callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.property.type === 'Identifier'
        ) {

          const objectName = callee.object.name;
          const methodName = callee.property.name;

          if (objectName === 'assert' && methodName !== 'ifError') {
            const expectedMessageArgIndex = methodName === 'ok' || methodName === 'strict' ? 1 : 2;
            if (node.arguments.length <= expectedMessageArgIndex) {
              context.report({
                node,
                message: `Missing message argument in ${methodName}() method.`,
              });
            }
          }
        }
      },
    };
  },
} as Rule.RuleModule;
