// no-util.ts

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
      description: 'Detects if file name is util',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
  },
  create(context) {
    return {
      Program() {
        const filename = context.filename;
        const utilRegex = /(?:^|\/)util(?:\.(?:spec|test))?\.ts$/u;
        if (utilRegex.test(filename)) {
          context.report({
            message: `File name '${filename}' contains banned 'util' pattern.`,
            loc: { line: 1, column: 0 },
          });
        }
      },
    };
  },
} as Rule.RuleModule;
