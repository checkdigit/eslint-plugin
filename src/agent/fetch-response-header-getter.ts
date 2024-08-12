// fixture/fetch-response-header-getter-ts.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fetch-response-header-getter-ts';
const HEADER_BUILTIN_FUNCTIONS = Object.keys(Headers.prototype);

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
      MemberExpression: (responseHeadersAccess: TSESTree.MemberExpression) => {
        try {
          if (
            responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier &&
            HEADER_BUILTIN_FUNCTIONS.includes(responseHeadersAccess.property.name)
          ) {
            // skip Headers's built-in function calls
            return;
          }

          const responseHeadersTsNode = parserServices.esTreeNodeToTSNodeMap.get(responseHeadersAccess.object);
          let responseHeadersType = typeChecker.getTypeAtLocation(responseHeadersTsNode);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          responseHeadersType = responseHeadersType.isUnion() ? responseHeadersType.types[0]! : responseHeadersType;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const responseHeadersTypeName = // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (responseHeadersType.symbol ?? responseHeadersType.aliasSymbol)?.escapedName;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (responseHeadersTypeName !== 'Headers' && responseHeadersTypeName !== 'HeaderGetter') {
            return;
          }

          let replacementText: string;
          if (!responseHeadersAccess.computed) {
            // e.g. headers.etag
            replacementText = `${sourceCode.getText(responseHeadersAccess.object)}.get('${sourceCode.getText(responseHeadersAccess.property)}')`;
          } else if (
            responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier ||
            responseHeadersAccess.property.type === AST_NODE_TYPES.Literal ||
            responseHeadersAccess.property.type === AST_NODE_TYPES.TemplateLiteral
          ) {
            replacementText = `${sourceCode.getText(responseHeadersAccess.object)}.get(${sourceCode.getText(responseHeadersAccess.property)})`;
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

      // convert response.get() to response.headers.get()
      'CallExpression[callee.property.name="get"]': (responseHeadersAccess: TSESTree.CallExpression) => {
        try {
          if (responseHeadersAccess.callee.type !== AST_NODE_TYPES.MemberExpression) {
            return;
          }

          // skip request-like calls
          if (
            responseHeadersAccess.callee.object.type !== AST_NODE_TYPES.Identifier ||
            responseHeadersAccess.callee.object.name === 'request'
          ) {
            return;
          }
          const responseNode = responseHeadersAccess.callee.object;
          const responseHeadersTsNode = parserServices.esTreeNodeToTSNodeMap.get(responseNode);
          const responseType = typeChecker.getTypeAtLocation(responseHeadersTsNode);
          const typeName = typeChecker.typeToString(responseType);
          if (typeName === 'InboundContext' || typeName.endsWith('RequestType')) {
            return;
          }

          // make sure the response type has "headers" property
          const hasHeadersProperty = responseType.getProperties().some((symbol) => symbol.name === 'headers');
          if (!hasHeadersProperty) {
            return;
          }

          const replacementText = `${sourceCode.getText(responseNode)}.headers`;
          context.report({
            messageId: 'useGetter',
            node: responseHeadersAccess,
            fix(fixer) {
              return fixer.replaceText(responseNode, replacementText);
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
