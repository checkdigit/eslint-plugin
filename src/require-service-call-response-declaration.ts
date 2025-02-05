// require-service-call-response-declaration.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from './get-documentation-url';
import { isServiceResponse } from './service';

export const ruleId = 'require-service-call-response-declaration';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'unknownError' | 'requireServiceCallResponseDeclaration'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Awaited service call is required to declare variable for its return value which should be examined later on.',
    },
    messages: {
      requireServiceCallResponseDeclaration:
        'Awaited service call is required to declare variable for its return value which should be examined later on.',
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
      AwaitExpression(serviceCall: TSESTree.AwaitExpression) {
        try {
          const tsNode = parserServices.esTreeNodeToTSNodeMap.get(serviceCall.argument);
          const type = typeChecker.getTypeAtLocation(tsNode);
          const awaitedType = typeChecker.getAwaitedType(type);
          if (
            awaitedType !== undefined &&
            isServiceResponse(awaitedType) &&
            serviceCall.parent.type !== AST_NODE_TYPES.VariableDeclarator
          ) {
            context.report({
              node: serviceCall,
              messageId: 'requireServiceCallResponseDeclaration',
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: serviceCall,
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
