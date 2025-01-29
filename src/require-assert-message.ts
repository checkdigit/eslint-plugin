// require-assert-message.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { ESLintUtils, TSESLint } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/types';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-assert-message';
const MISSING_ASSERT_MESSAGE = 'MISSING_ASSERT_MESSAGE';

const methodsRequiringMessage = Object.keys(assert).filter((key) => typeof (assert as never)[key] === 'function');

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const rule: TSESLint.RuleModule<string, unknown[]> = createRule({
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

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'node:assert') {
          const specifier = node.specifiers.find(
            (importSpecifier) =>
              importSpecifier.type === TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier ||
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

          if (objectName === assertAlias && methodsRequiringMessage.includes(methodName)) {
            const messageIndexMap: Record<string, number> = {
              fail: 0,
              ok: 1,
            };
            const messageIndex = messageIndexMap[methodName] ?? 2;

            if (node.arguments.length <= messageIndex) {
              context.report({
                node,
                messageId: MISSING_ASSERT_MESSAGE,
                data: {
                  methodName,
                },
              });
            }
          }
        } else if (
          callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
          callee.name === assertAlias &&
          node.arguments.length < 2
        ) {
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
