// agent/no-unused-service-variable.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { Scope } from '@typescript-eslint/utils/ts-eslint';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from '../get-documentation-url';
import { getEnclosingScopeNode } from '../library/ts-tree';

export const ruleId = 'no-unused-service-variable';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Remove unused service variables.',
    },
    messages: {
      removeUnusedServiceVariables: 'Removing unused service variables.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;

    function isVariableUsed(variableIdentifier: TSESTree.Identifier, scope: Scope.Scope): boolean {
      const variable = scope.variables.find((variableToCheck) => variableToCheck.name === variableIdentifier.name);
      return variable !== undefined && variable.references.length > 1;
    }

    return {
      VariableDeclaration(variableDeclaration: TSESTree.VariableDeclaration) {
        try {
          if (
            variableDeclaration.declarations.length !== 1 ||
            !sourceCode.getText(variableDeclaration).includes('.service.')
          ) {
            return;
          }

          const enclosingScopeNode = getEnclosingScopeNode(variableDeclaration);
          assert.ok(enclosingScopeNode, 'enclosingScopeNode is undefined');

          const declarator = variableDeclaration.declarations[0];
          assert.ok(declarator, 'variable declaration is undefined');
          if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
            return;
          }

          const scope = scopeManager?.acquire(enclosingScopeNode);
          assert.ok(scope, 'variable declaration is undefined');
          if (isVariableUsed(declarator.id, scope)) {
            return;
          }

          context.report({
            node: variableDeclaration,
            messageId: 'removeUnusedServiceVariables',
            fix(fixer) {
              return fixer.remove(variableDeclaration);
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: variableDeclaration,
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
