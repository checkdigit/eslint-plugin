// agent/fix-function-call-arguments.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import debug from 'debug';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fix-function-call-arguments';

export interface FixFunctionCallArgumentsRuleOptions {
  typesToCheck: string[];
}
const DEFAULT_OPTIONS = {
  typesToCheck: [
    'Configuration<ResolvedServices>',
    'Fixture<ResolvedServices>',
    'InboundContext',
    '{ get: () => string; }',
  ],
};

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const log = debug('eslint-plugin:fix-function-call-arguments');

const rule: ESLintUtils.RuleModule<
  'removeIncompatibleFunctionArguments' | 'unknownError',
  [FixFunctionCallArgumentsRuleOptions]
> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Remove incompatible function arguments.',
    },
    messages: {
      removeIncompatibleFunctionArguments: 'Removing incompatible function arguments.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          typesToCheck: {
            description: 'Text representation of the types of which the function call parameters will be examine',
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [DEFAULT_OPTIONS],
  create(context) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const { typesToCheck } = context.options[0] ?? DEFAULT_OPTIONS;
    const parserServices = ESLintUtils.getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();
    const sourceCode = context.sourceCode;

    return {
      CallExpression(callExpression) {
        // ignore calls like `foo.bar()` which are likely to be 3rd party module calls
        // we only focus on calls against local functions or functions imported from the same module
        if (callExpression.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
          return;
        }

        log('===== file name:', context.filename);
        log('callExpression:', sourceCode.getText(callExpression));
        try {
          const calleeTsNode = parserServices.esTreeNodeToTSNodeMap.get(callExpression.callee);
          const calleeType = typeChecker.getTypeAtLocation(calleeTsNode);

          const signatures = calleeType.getCallSignatures();
          if (signatures.length > 1) {
            // ignore complex signatures with overloads
            return;
          }

          const signature = signatures[0];
          assert.ok(signature, 'Signature not found.');
          if (signature.typeParameters !== undefined && signature.typeParameters.length > 0) {
            // ignore complex signatures with type parameters
            return;
          }

          log('signature:', signature.getDeclaration().getText());
          const expectedParameters = signature.getParameters();
          log(
            'expected parameters:',
            expectedParameters.map((expectedParameter) =>
              typeChecker.typeToString(typeChecker.getTypeOfSymbol(expectedParameter)),
            ),
          );
          const expectedParametersCount = expectedParameters.length;
          const actualParameters = callExpression.arguments;
          const actualParametersCount = actualParameters.length;
          if (actualParametersCount === 0 || actualParametersCount === expectedParametersCount) {
            return;
          }

          const parametersToKeep: TSESTree.CallExpressionArgument[] = [];
          let expectedParameterIndex = 0;
          for (const [actualParameterIndex, actualParameter] of actualParameters.entries()) {
            if (expectedParameterIndex >= expectedParametersCount) {
              break;
            }

            const expectedParameter = expectedParameters[expectedParameterIndex];
            assert.ok(expectedParameter, 'Expected parameter not found.');

            const expectedType = typeChecker.getTypeOfSymbol(expectedParameter);
            const actualType = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(actualParameter));
            const actualTypeString = typeChecker.typeToString(actualType);
            log(
              'expected type: #',
              expectedParameterIndex,
              expectedParameter.escapedName,
              typeChecker.typeToString(expectedType),
            );
            log('actual type: #', actualParameterIndex, sourceCode.getText(actualParameter), actualTypeString);

            if (!typesToCheck.includes(actualTypeString) && !actualTypeString.endsWith('RequestType')) {
              // skip the parameter type checking if it's not in the candidate types
              parametersToKeep.push(actualParameter);
              log('skipped');
            } else if (typeChecker.isTypeAssignableTo(actualType, expectedType)) {
              parametersToKeep.push(actualParameter);
              log('matched');
              expectedParameterIndex++;
            } else {
              log('not matched');
            }
          }

          if (parametersToKeep.length === actualParametersCount) {
            return;
          }

          const firstParameter = actualParameters[0];
          const lastParameter = actualParameters.at(-1);
          assert.ok(firstParameter !== undefined && lastParameter !== undefined);
          const tokenAfterParameters = sourceCode.getTokenAfter(lastParameter);

          context.report({
            node: callExpression,
            messageId: 'removeIncompatibleFunctionArguments',
            fix(fixer) {
              return fixer.replaceTextRange(
                [
                  firstParameter.range[0],
                  tokenAfterParameters?.value === ',' ? tokenAfterParameters.range[1] : lastParameter.range[1],
                ],
                parametersToKeep.map((arg) => sourceCode.getText(arg)).join(', '),
              );
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: callExpression,
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
