// no-status-code-assert.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'no-status-code-assert';
const NO_STATUS_CODE_ASSERT = 'NO_STATUS_CODE_ASSERT';
const keywords = ['status', 'code', 'StatusCodes', 'statusCode'];

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

/**
 * Checks if a given AST node contains any identifier, member expression, or binary expression
 * that includes the keywords 'status', 'code', 'StatusCodes', or 'statusCode'.
 *
 * @param arg - The AST node to check.
 * @returns `true` if the node or its sub-nodes contain any of the specified keywords, otherwise `false`.
 */
const hasStatusCodeOrValue = (arg: TSESTree.Node): boolean => {
  const checkName = (name?: string): boolean =>
    name !== undefined && keywords.some((keyword) => name.toLowerCase().includes(keyword));

  switch (arg.type) {
    case AST_NODE_TYPES.Identifier:
      return checkName(arg.name);
    case AST_NODE_TYPES.MemberExpression: {
      const object = arg.object;
      const property = arg.property;
      if (object.type === AST_NODE_TYPES.Identifier && checkName(object.name)) {
        return true;
      }
      if (property.type === AST_NODE_TYPES.Identifier) {
        return checkName(property.name);
      }
      if (property.type === AST_NODE_TYPES.Literal && typeof property.value === 'string') {
        return checkName(property.value);
      }
      break;
    }
    case AST_NODE_TYPES.BinaryExpression:
      return hasStatusCodeOrValue(arg.left) || hasStatusCodeOrValue(arg.right);
  }
  return false;
};

/**
 * Checks if a given AST node is an identifier with the name 'assert'.
 *
 * @param node - The AST node to check.
 * @returns `true` if the node is an identifier with the name 'assert', otherwise `false`.
 */
const isAssertIdentifier = (node: TSESTree.Node): boolean =>
  node.type === AST_NODE_TYPES.Identifier && node.name === 'assert';

/**
 * Checks if a given AST node is a member expression with the object named 'assert'.
 *
 * @param node - The AST node to check.
 * @returns `true` if the node is a member expression with the object named 'assert', otherwise `false`.
 */
const isAssertMemberExpression = (node: TSESTree.Node): boolean =>
  node.type === AST_NODE_TYPES.MemberExpression &&
  node.object.type === AST_NODE_TYPES.Identifier &&
  node.object.name === 'assert' &&
  node.property.type === AST_NODE_TYPES.Identifier;

const rule: TSESLint.RuleModule<typeof NO_STATUS_CODE_ASSERT> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow using status codes in assertions; use error handling instead',
    },
    schema: [],
    messages: {
      [NO_STATUS_CODE_ASSERT]: 'Do not use status codes in assertions; use error handling instead',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (
          (isAssertIdentifier(callee) || isAssertMemberExpression(callee)) &&
          node.arguments.some(hasStatusCodeOrValue)
        ) {
          context.report({
            node,
            messageId: NO_STATUS_CODE_ASSERT,
          });
        }
      },
    };
  },
});

export default rule;
