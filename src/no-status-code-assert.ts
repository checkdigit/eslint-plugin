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
 * Checks if a given string contains any of the specified keywords ('status', 'code', 'StatusCodes', or 'statusCode').
 *
 * @param name - The string to check.
 * @returns `true` if the string contains any of the specified keywords, otherwise `false`.
 */
const checkName = (name?: string): boolean =>
  name !== undefined && keywords.some((keyword) => name.toLowerCase().includes(keyword));

/**
 * Checks if a given AST node contains any identifier, member expression, or binary expression
 * that includes the keywords 'status', 'code', 'StatusCodes', or 'statusCode'.
 *
 * @param arg - The AST node to check.
 * @returns `true` if the node or its sub-nodes contain any of the specified keywords, otherwise `false`.
 */
const hasStatusCodeOrValue = (arg: TSESTree.Node): boolean => {
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

const rule: TSESLint.RuleModule<typeof NO_STATUS_CODE_ASSERT> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of status, code, or value as parameter in assert',
    },
    schema: [],
    messages: {
      [NO_STATUS_CODE_ASSERT]: 'Avoid using status, code, or value in assert',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.arguments.some(hasStatusCodeOrValue)) {
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
