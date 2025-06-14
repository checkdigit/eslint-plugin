// no-util.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_TOKEN_TYPES, ESLintUtils } from '@typescript-eslint/utils';

export const ruleId = 'no-util';
const NO_UTIL = 'NO_UTIL';

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
        const utilRegex = /(?:^|[-_/])util(?=[-_./]|$)/iu;
        if (utilRegex.test(filename)) {
          const sourceCode = context.sourceCode;
          const tokens = sourceCode.tokensAndComments;
          const firstNonCommentToken = tokens.find(
            (token) => token.type !== AST_TOKEN_TYPES.Block && token.type !== AST_TOKEN_TYPES.Line,
          );
          if (firstNonCommentToken !== undefined) {
            context.report({
              messageId: NO_UTIL,
              data: { filename },
              node: firstNonCommentToken,
            });
          }
        }
      },
    };
  },
});

export default rule;
