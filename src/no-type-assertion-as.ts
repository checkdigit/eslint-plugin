// no-type-assertion-as.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ruleId = 'no-as-type-assertion';
const NO_AS_TYPE_ASSERTION = 'NO_AS_TYPE_ASSERTION';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof NO_AS_TYPE_ASSERTION> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow the use of `as` type assertions and suggest using `satisfies` instead',
    },
    schema: [],
    messages: {
      [NO_AS_TYPE_ASSERTION]: 'Avoid using `as` type assertions. Use `satisfies` instead.',
    },
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAsExpression(node: TSESTree.TSAsExpression) {
        context.report({
          node,
          messageId: NO_AS_TYPE_ASSERTION,
          fix: (fixer) => {
            const sourceCode = context.sourceCode;
            const typeAnnotation = sourceCode.getText(node.typeAnnotation);
            const expression = sourceCode.getText(node.expression);
            return fixer.replaceText(node, `${expression} satisfies ${typeAnnotation}`);
          },
        });
      },
    };
  },
});

export default rule;
