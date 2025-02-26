// no-util.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export const ruleId = 'no-util';
const NO_UTIL = 'NO_UTIL';
const DISABLE_NEXT_LINE = 'eslint-disable-next-line';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof NO_UTIL> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects if file name is util',
    },
    schema: [],
    messages: {
      [NO_UTIL]: "File name '{{filename}}' contains banned 'util' pattern.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program() {
        const filename = context.filename;
        const firstLine = context.sourceCode.getLines()[0];
        if (firstLine === undefined) {
          return;
        }
        const actualComment = firstLine.split('// ')[1];
        if (actualComment?.startsWith(DISABLE_NEXT_LINE) === true) {
          return;
        }
        const utilRegex = /(?:^|[-_/])util(?=[-_./]|$)/iu;
        if (utilRegex.test(filename)) {
          context.report({
            messageId: NO_UTIL,
            data: { filename },
            loc: {
              start: { line: 0, column: 0 },
              end: { line: 0, column: 1 },
            },
          });
        }
      },
    };
  },
});

export default rule;
