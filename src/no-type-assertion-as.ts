// no-type-assertion-as.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ruleId = 'no-as-type-assertion';
const NO_AS_TYPE_ASSERTION = 'NO_AS_TYPE_ASSERTION';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof NO_AS_TYPE_ASSERTION> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `as` type assertions and suggest using `satisfies` instead',
    },
    schema: [],
    messages: {
      [NO_AS_TYPE_ASSERTION]: 'Avoid using `as` type assertions. Use `satisfies` instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAsExpression(node: TSESTree.TSAsExpression) {
        const isUnknownUnionOrIntersection =
          (node.typeAnnotation.type === AST_NODE_TYPES.TSUnionType ||
            node.typeAnnotation.type === AST_NODE_TYPES.TSIntersectionType) &&
          node.typeAnnotation.types.some((type) => type.type === AST_NODE_TYPES.TSUnknownKeyword);

        if (
          node.typeAnnotation.type === AST_NODE_TYPES.TSUnknownKeyword ||
          (node.expression.type === AST_NODE_TYPES.TSAsExpression &&
            node.expression.typeAnnotation.type === AST_NODE_TYPES.TSUnknownKeyword) ||
          isUnknownUnionOrIntersection
        ) {
          if (node.parent.type !== AST_NODE_TYPES.TSAsExpression) {
            context.report({
              node,
              messageId: NO_AS_TYPE_ASSERTION,
            });
          }
        } else {
          context.report({
            node,
            messageId: NO_AS_TYPE_ASSERTION,
          });
        }
      },
    };
  },
});

export default rule;
