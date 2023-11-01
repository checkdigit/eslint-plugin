// require-strict-assert.ts

import type { Rule } from 'eslint';

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require importing strict version of node:assert',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          node.source.value === 'node:assert' &&
          !node.specifiers.every(
            (specifier) => specifier.type === 'ImportSpecifier' && specifier.imported.name === 'strict',
          )
        ) {
          context.report({
            node,
            message: 'Require the strict version of node:assert.',
          });
        }
      },
    };
  },
} as Rule.RuleModule;
