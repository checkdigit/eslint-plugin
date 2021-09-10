// file-path-comment.ts

import type { Rule } from 'eslint';

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate that first line of file is a path to the file',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context) {
    const firstLine = context.getSourceCode().getLines()[0] as string;
    const expectedPath = context.getFilename().split('src/')[1];

    if (!firstLine.startsWith('//')) {
      if (firstLine.startsWith('/*')) {
        context.report({
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
          message: 'first line cannot be a block comment',
          fix(fixer: Rule.RuleFixer) {
            return fixer.insertTextBeforeRange([0, 0], `// ${expectedPath}\n\n`);
          },
        });
      } else {
        context.report({
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
          message: 'first line is not a comment with the file path',
          fix(fixer: Rule.RuleFixer) {
            return fixer.insertTextBeforeRange([0, 0], `// ${expectedPath}\n\n`);
          },
        });
      }
    } else {
      const actualComment = firstLine.split('// ')[1];
      if (expectedPath !== actualComment) {
        context.report({
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
          message: 'first line is a comment but is not a path to the file',
          fix(fixer: Rule.RuleFixer) {
            return fixer.replaceTextRange([0, firstLine.length], `// ${expectedPath}`);
          },
        });
      }
    }

    return {};
  },
} as Rule.RuleModule;
