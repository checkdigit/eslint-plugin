// no-status-code-assert.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'no-status-code-assert';
const NO_STATUS_CODE_ASSERT = 'NO_STATUS_CODE_ASSERT';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

// Checks if a given AST node contains any status code value.
const hasStatusCodeOrValue = (arg: TSESTree.Node): boolean => {
  switch (arg.type) {
    case AST_NODE_TYPES.MemberExpression: {
      const object = arg.object;
      const property = arg.property;
      if (
        object.type === AST_NODE_TYPES.Identifier &&
        object.name === 'StatusCodes' &&
        property.type === AST_NODE_TYPES.Identifier
      ) {
        return true;
      }
      break;
    }
    case AST_NODE_TYPES.BinaryExpression:
      return hasStatusCodeOrValue(arg.left) || hasStatusCodeOrValue(arg.right);
  }
  return false;
};

// Checks if a given AST node is an identifier with the name 'assert'.
const isAssertIdentifier = (node: TSESTree.Node): boolean =>
  node.type === AST_NODE_TYPES.Identifier && node.name === 'assert';

// Checks if a given AST node is a member expression with the object named 'assert'.
const isAssertMemberExpression = (node: TSESTree.Node): boolean =>
  node.type === AST_NODE_TYPES.MemberExpression &&
  node.object.type === AST_NODE_TYPES.Identifier &&
  node.object.name === 'assert' &&
  node.property.type === AST_NODE_TYPES.Identifier;

const isAssertCallWithStatusCode = (callee: TSESTree.Node, args: TSESTree.Node[]): boolean =>
  (isAssertIdentifier(callee) || isAssertMemberExpression(callee)) && args.some((arg) => hasStatusCodeOrValue(arg));

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
        if (isAssertCallWithStatusCode(callee, node.arguments)) {
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
