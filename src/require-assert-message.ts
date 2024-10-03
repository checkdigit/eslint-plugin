// require-assert-message.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

// require-assert-message.ts

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ruleId = 'require-assert-message';
const MISSING_ASSERT_MESSAGE = 'MISSING_ASSERT_MESSAGE';

const createRule = ESLintUtils.RuleCreator((name) => name);

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that message argument is always supplied to node:assert methods',
    },
    schema: [],
    messages: {
      [MISSING_ASSERT_MESSAGE]: 'Missing message argument in {{methodName}}() method.',
    },
  },
  defaultOptions: [],
  create(context) {
    let assertAlias = 'assert';

    // List of assert methods and their parameter names
    const assertMethods: Record<string, string[]> = {
      assert: ['value', 'message'],
      deepEqual: ['actual', 'expected', 'message'],
      deepStrictEqual: ['actual', 'expected', 'message'],
      doesNotMatch: ['string', 'regexp', 'message'],
      doesNotReject: ['asyncFn', 'error', 'message'],
      doesNotThrow: ['fn', 'error', 'message'],
      equal: ['actual', 'expected', 'message'],
      fail: ['message'],
      ifError: ['value'],
      match: ['string', 'regexp', 'message'],
      notDeepEqual: ['actual', 'expected', 'message'],
      notDeepStrictEqual: ['actual', 'expected', 'message'],
      notEqual: ['actual', 'expected', 'message'],
      notStrictEqual: ['actual', 'expected', 'message'],
      ok: ['value', 'message'],
      rejects: ['asyncFn', 'error', 'message'],
      strictEqual: ['actual', 'expected', 'message'],
      throws: ['fn', 'error', 'message'],
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'node:assert') {
          const specifier = node.specifiers.find(
              (importSpecifier) =>  importSpecifier.type === TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier ||
                  importSpecifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier,
          );
          if (specifier) {
            assertAlias = specifier.local.name;
          }
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (
            callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
            callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
            callee.property.type === TSESTree.AST_NODE_TYPES.Identifier
        ) {
          const objectName = callee.object.name;
          const methodName = callee.property.name;

          if (objectName === assertAlias && methodName in assertMethods) {
            const paramNames = assertMethods[methodName];
            if (paramNames) {
              const messageIndex = paramNames.indexOf('message');
              if (messageIndex !== -1 && node.arguments.length <= messageIndex) {
                context.report({
                  node,
                  messageId: MISSING_ASSERT_MESSAGE,
                  data: {
                    methodName,
                  },
                });
              }
            }
          }
        } else if (callee.type === TSESTree.AST_NODE_TYPES.Identifier && callee.name === assertAlias && node.arguments.length < 2) {
          context.report({
            node,
            messageId: MISSING_ASSERT_MESSAGE,
            data: {
              methodName: 'assert',
            },
          });
        }
      },
    };
  },
});

export default rule;
