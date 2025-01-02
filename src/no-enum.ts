// no-enum.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ruleId = 'no-enum';
const NO_ENUM = 'NO_ENUM';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof NO_ENUM> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `enum` in TypeScript',
    },
    schema: [],
    messages: {
      [NO_ENUM]: 'Avoid using `enum` in TypeScript.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TSEnumDeclaration(node: TSESTree.TSEnumDeclaration) {
        context.report({
          node,
          messageId: NO_ENUM,
        });
      },
    };
  },
});

export default rule;
