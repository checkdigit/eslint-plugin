// file-path-comment.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export const ruleId = 'validate-first-line-path';
const VALIDATE_FIRST_LINE_PATH = 'VALIDATE_FIRST_LINE_PATH';
const DISABLE_NEXT_LINE = 'eslint-disable-next-line';
const DISABLED_RULE = 'no-util';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof VALIDATE_FIRST_LINE_PATH> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate that first line of file is a path to the file',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [VALIDATE_FIRST_LINE_PATH]: "First line '{{firstLine}}' is not a valid path to the file.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program() {
        const firstLine = context.sourceCode.getLines()[0];
        const expectedPath = context.filename.split('src/')[1];

        if (firstLine === undefined || expectedPath === undefined) {
          return;
        }

        if (!firstLine.startsWith('//')) {
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
            messageId: VALIDATE_FIRST_LINE_PATH,
            data: { firstLine },
            fix(fixer) {
              return fixer.insertTextBeforeRange([0, 0], `// ${expectedPath}\n\n`);
            },
          });
        } else {
          const actualComment = firstLine.split('// ')[1];

          if (actualComment?.startsWith(DISABLE_NEXT_LINE) === true && actualComment.endsWith(DISABLED_RULE)) {
            return;
          }

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
              messageId: VALIDATE_FIRST_LINE_PATH,
              data: { firstLine },
              fix(fixer) {
                return fixer.replaceTextRange([0, firstLine.length], `// ${expectedPath}`);
              },
            });
          }
        }
      },
    };
  },
});

export default rule;
