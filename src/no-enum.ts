// no-enum.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node } from 'estree';
import type { Rule } from 'eslint';

const ENUM_FOUND = 'ENUM_FOUND';
const ENUMS_FOUND = 'ENUMS_FOUND';

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects if a file contains enum keyword',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [ENUM_FOUND]: `enum found`,
      [ENUMS_FOUND]: `Multiple enums found`,
    },
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

