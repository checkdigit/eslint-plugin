// agent/add-url-domain.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { addBasePathUrlDomain } from './url';

export const ruleId = 'add-url-domain';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'addDomain' | 'unknownError'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Add HTTP domain to the BASE_PATH like url constant variable.',
    },
    messages: {
      addDomain: 'Add HTTP domain to the BASE_PATH like url constant variable.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      'VariableDeclarator[id.name=/^([A-Z]+_)*BASE_PATH$/]': (basePathDeclarator: TSESTree.VariableDeclarator) => {
        try {
          if (
            basePathDeclarator.init === null ||
            (basePathDeclarator.init.type !== AST_NODE_TYPES.Literal &&
              basePathDeclarator.init.type !== AST_NODE_TYPES.TemplateLiteral)
          ) {
            return;
          }

          const urlText = sourceCode.getText(basePathDeclarator.init);
          const replacement = addBasePathUrlDomain(urlText);

          if (replacement !== urlText) {
            context.report({
              messageId: 'addDomain',
              node: basePathDeclarator.init,
              fix(fixer) {
                return fixer.replaceText(basePathDeclarator.init as TSESTree.Node, replacement);
              },
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: basePathDeclarator,
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
