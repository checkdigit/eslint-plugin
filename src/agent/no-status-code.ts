// agent/no-status-code.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { isFetchResponse } from './fetch';

export const ruleId = 'no-status-code';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'unknownError' | 'replaceStatusCode'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Access the status code property of the fetch Response using "status" instead of "statusCode".',
    },
    messages: {
      replaceStatusCode: 'Replace "statusCode" with "status".',
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
      'MemberExpression[property.name="statusCode"]': (responseStatusCode: TSESTree.MemberExpression) => {
        try {
          const responseNode = parserServices.esTreeNodeToTSNodeMap.get(responseStatusCode.object);
          const responseType = typeChecker.getTypeAtLocation(responseNode);

          if (isFetchResponse(responseType)) {
            context.report({
              messageId: 'replaceStatusCode',
              node: responseStatusCode.property,
              fix(fixer) {
                return fixer.replaceText(responseStatusCode.property, 'status');
              },
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: responseStatusCode,
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
