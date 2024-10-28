// agent/no-unused-function-argument.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { Scope } from '@typescript-eslint/utils/ts-eslint';

import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'no-unused-function-argument';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'unknownError' | 'removeUnusedFunctionArguments'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Remove unused function arguments.',
    },
    messages: {
      removeUnusedFunctionArguments: 'Removing unused function arguments.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function isParameterUsed(parameter: TSESTree.Identifier, scope: Scope.Scope): boolean {
      return (
        scope.references.some((ref) => ref.identifier.name === parameter.name) ||
        scope.childScopes.some((childScope) => isParameterUsed(parameter, childScope))
      );
    }

    return {
      FunctionDeclaration(functionDeclaration: TSESTree.FunctionDeclaration) {
        try {
          const parameters = functionDeclaration.params;
          if (parameters.length === 0) {
            return;
          }

          const functionScope = sourceCode.getScope(functionDeclaration);
          const parametersToKeep = parameters.filter(
            (parameter) =>
              parameter.type !== TSESTree.AST_NODE_TYPES.Identifier || isParameterUsed(parameter, functionScope),
          );
          if (parametersToKeep.length === parameters.length) {
            return;
          }

          const updatedParameters = parametersToKeep.map((parameter) => sourceCode.getText(parameter)).join(', ');
          context.report({
            node: functionDeclaration,
            messageId: 'removeUnusedFunctionArguments',
            fix(fixer) {
              const firstParameter = parameters[0];
              const lastParameter = parameters.at(-1);
              assert.ok(firstParameter !== undefined && lastParameter !== undefined);
              const tokenAfterParameters = sourceCode.getTokenAfter(lastParameter);

              return fixer.replaceTextRange(
                [
                  firstParameter.range[0],
                  tokenAfterParameters?.value === ',' ? tokenAfterParameters.range[1] : lastParameter.range[1],
                ],
                updatedParameters,
              );
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: functionDeclaration,
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
