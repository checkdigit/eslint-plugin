// agent/fetch-response-status.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { isFetchResponse } from './fetch';

export const ruleId = 'fetch-response-status';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'unknownError' | 'renameStatusCodeProperty'> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Replace "response.body" with "await response.json()".',
    },
    messages: {
      renameStatusCodeProperty: 'Rename "statusCode" with "status".',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();

    return {
      VariableDeclaration: (variableDeclaration: TSESTree.VariableDeclaration) => {
        const variableInit = variableDeclaration.declarations[0]?.init;
        if (
          !variableInit ||
          variableInit.type !== AST_NODE_TYPES.AwaitExpression ||
          variableInit.argument.type !== AST_NODE_TYPES.CallExpression
        ) {
          return;
        }

        const variableId = variableDeclaration.declarations[0]?.id;
        if (variableId.type !== AST_NODE_TYPES.ObjectPattern) {
          return;
        }
        const statusCodeProperty = variableId.properties.find<TSESTree.Property>(
          (property): property is TSESTree.Property =>
            property.type === AST_NODE_TYPES.Property &&
            property.key.type === AST_NODE_TYPES.Identifier &&
            property.key.name === 'statusCode',
        );
        if (!statusCodeProperty) {
          return;
        }

        if (
          variableInit.argument.callee.type !== AST_NODE_TYPES.Identifier ||
          variableInit.argument.callee.name !== 'fetch'
        ) {
          const variableNode = parserServices.esTreeNodeToTSNodeMap.get(variableId);
          const variableType = typeChecker.getTypeAtLocation(variableNode);
          if (!isFetchResponse(variableType)) {
            return;
          }
        }

        try {
          context.report({
            node: statusCodeProperty,
            messageId: 'renameStatusCodeProperty',
            fix(fixer) {
              return statusCodeProperty.shorthand
                ? fixer.replaceText(statusCodeProperty, 'status: statusCode')
                : fixer.replaceText(statusCodeProperty.key, 'status');
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: statusCodeProperty,
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
