// agent/no-full-response.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';
import { getTypeParentNode } from '../library/ts-tree';

export const ruleId = 'no-full-response';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'removeFullResponse' | 'unknownError'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Remove the usage of FullResponse type.',
    },
    messages: {
      removeFullResponse: 'Removing the usage of FullResponse type.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      'TSTypeReference[typeName.name="FullResponse"]': (typeReference: TSESTree.TSTypeReference) => {
        try {
          const typeParentNode = getTypeParentNode(typeReference);
          assert.ok(typeParentNode);
          if (typeParentNode.type === TSESTree.AST_NODE_TYPES.TSAsExpression) {
            context.report({
              messageId: 'removeFullResponse',
              node: typeReference,
              fix(fixer) {
                return fixer.replaceText(typeParentNode, sourceCode.getText(typeParentNode.expression));
              },
            });
          } else {
            context.report({
              messageId: 'removeFullResponse',
              node: typeReference,
              fix(fixer) {
                return fixer.remove(typeParentNode);
              },
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: typeReference,
            messageId: 'unknownError',
            data: {
              fileName: context.filename,
              error: error instanceof Error ? error.toString() : JSON.stringify(error),
            },
          });
        }
      },
    };
  },
});

export default rule;
