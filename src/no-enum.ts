// no-enum.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ruleId = 'no-enum';
const NO_ENUM = 'NO_ENUM';

const createRule = ESLintUtils.RuleCreator((name) => name);

function isJsonSchemaProperty(node?: TSESTree.Node): boolean {
  if (!node) {
    return false;
  }
  if (
    node.type === TSESTree.AST_NODE_TYPES.Property &&
    node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
    node.key.name === 'properties'
  ) {
    return true;
  }
  return isJsonSchemaProperty(node.parent);
}

const rule = createRule({
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
      Property(node: TSESTree.Property) {
        if (
          node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
          node.key.name === 'enum' &&
          node.value.type === TSESTree.AST_NODE_TYPES.ArrayExpression &&
          !isJsonSchemaProperty(node.parent)
        ) {
          context.report({
            node,
            messageId: NO_ENUM,
          });
        }
      },
    };
  },
});

export default rule;
