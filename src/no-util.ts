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
        const utilRegex = /(?:^|[-_/])util(?=[-_./]|$)/iu;
        if (utilRegex.test(filename)) {
          context.report({
            message: `File name '${filename}' contains banned 'util' pattern.`,
            loc: {
              start: {
                line: 0,
                column: 0,
              },
              end: {
                line: 0,
                column: 1,
              },
            },
          });
        }
      },
    };
  },
} as Rule.RuleModule;
