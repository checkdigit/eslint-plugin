// no-enum.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node } from 'estree';
import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects if a file contains enum keyword',
      url: 'https://github.com/checkdigit/eslint-plugin',
    }
  },
  create: function (context) {
    return {
      TSEnumDeclaration: function (node: Node) {
        context.report({
          node,
          message: "Avoid using enums in TypeScript files.",
        });
      },
    };
  },
} as Rule.RuleModule;

