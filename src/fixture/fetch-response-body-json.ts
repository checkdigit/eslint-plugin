// fixture/fetch-response-body-json.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fetch-response-body-json';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Replace "response.body" with "await response.json()".',
    },
    messages: {
      replaceBodyWithJson: 'Replace "response.body" with "await response.json()".',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();
    const sourceCode = context.sourceCode;

    return {
      'MemberExpression[property.name="body"]': (responseBody: TSESTree.MemberExpression) => {
        try {
          const responseNode = parserServices.esTreeNodeToTSNodeMap.get(responseBody.object);
          const responseType = typeChecker.getTypeAtLocation(responseNode);

          const shouldReplace =
            responseType.getProperties().some((symbol) => symbol.name === 'body') &&
            responseType.getProperties().some((symbol) => symbol.name === 'json');

          if (shouldReplace) {
            const responseText = sourceCode.getText(responseBody.object);
            context.report({
              messageId: 'replaceBodyWithJson',
              node: responseBody,
              fix(fixer) {
                return fixer.replaceText(responseBody, `(await ${responseText}.json())`);
              },
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: responseBody,
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
