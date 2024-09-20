// fixture/no-mapped-response-type.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'no-mapped-response';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Replace the usage of MappedResponse type with FetchResponse.',
    },
    messages: {
      replaceFullResponseWithFetchResponse: 'Replace the usage of FullResponse type with FetchResponse.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      'TSTypeReference[typeName.name="MappedResponse"]': (typeReference: TSESTree.TSTypeReference) => {
        try {
          context.report({
            messageId: 'replaceFullResponseWithFetchResponse',
            node: typeReference,
            fix(fixer) {
              const typeParams = sourceCode.getText(typeReference.typeArguments);
              return fixer.replaceText(typeReference, `FetchResponse${typeParams || ''}`);
            },
          });
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
      'ImportSpecifier[imported.name="MappedResponse"]': (importSpecifier: TSESTree.ImportSpecifier) => {
        try {
          context.report({
            messageId: 'replaceFullResponseWithFetchResponse',
            node: importSpecifier.imported,
            fix(fixer) {
              return fixer.replaceText(importSpecifier.imported, 'FetchResponse');
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: importSpecifier.imported,
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
