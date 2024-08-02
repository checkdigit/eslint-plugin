// fixture/fetch-response-header-getter-ts.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fetch-response-header-getter-ts';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use "get()" method to get header value from the headers object of the fetch response.',
    },
    messages: {
      useGetter: 'Use "get()" method to get header value from the headers object of the fetch response.',
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
      'MemberExpression[object.property.name="headers"]': (responseHeadersAccess: TSESTree.MemberExpression) => {
        try {
          if (
            responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier &&
            responseHeadersAccess.property.name === 'get'
          ) {
            // getter is already being used
            return;
          }

          const responseHeadersTsNode = parserServices.esTreeNodeToTSNodeMap.get(responseHeadersAccess.object);
          const responseType = typeChecker.getTypeAtLocation(responseHeadersTsNode);

          const shouldReplace = responseType.getProperties().some((symbol) => symbol.name === 'get');
          if (!shouldReplace) {
            return;
          }

          // let replacementText = 'xxx';
          // if (responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier) {
          //   replacementText = `${sourceCode.getText(responseHeadersAccess.object)}.get(${sourceCode.getText(responseHeadersAccess.property)})`;
          // }
          let replacementText: string;
          if (responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier) {
            replacementText = `${sourceCode.getText(responseHeadersAccess.object)}.get(${sourceCode.getText(responseHeadersAccess.property)})`;
          } else if (responseHeadersAccess.property.type === AST_NODE_TYPES.TemplateLiteral) {
            replacementText = `${sourceCode.getText(responseHeadersAccess.object)}.get(${sourceCode.getText(responseHeadersAccess.property)})`;
          } else if (responseHeadersAccess.property.type === AST_NODE_TYPES.Literal) {
            replacementText = responseHeadersAccess.computed
              ? `${sourceCode.getText(responseHeadersAccess.object)}.get(${sourceCode.getText(responseHeadersAccess.property)})`
              : `${sourceCode.getText(responseHeadersAccess.object)}.get('${sourceCode.getText(responseHeadersAccess.property)}')`;
          } else {
            throw new Error(`Unexpected property type: ${responseHeadersAccess.property.type}`);
          }

          context.report({
            messageId: 'useGetter',
            node: responseHeadersAccess.property,
            fix(fixer) {
              return fixer.replaceText(responseHeadersAccess, replacementText);
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: responseHeadersAccess,
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
