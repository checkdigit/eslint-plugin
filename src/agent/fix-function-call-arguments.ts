// agent/fix-function-call-arguments.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { strict as assert } from 'node:assert';
import debug from 'debug';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fix-function-call-arguments';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const log = debug('eslint-plugin:fix-function-call-arguments');

const rule = createRule({
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
    schema: [],
  },
  defaultOptions: [],
  create(context) {
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
          if (
            // ignore complex signatures with overloads
            signatures.length > 1
          ) {
            return;
          }

          const signature = signatures[0];
          if (
            !signature ||
            // ignore complex signatures
            (signature.typeParameters !== undefined && signature.typeParameters.length > 0)
          ) {
            return;
          }

          const signatureParameters = signature.getParameters();
          const expectedParametersCount = signatureParameters.length;
          const actualParameters = callExpression.arguments;
          const actualParametersCount = actualParameters.length;
          if (actualParametersCount === 0 || actualParametersCount === expectedParametersCount) {
            return;
          }
          const parametersToKeep: TSESTree.CallExpressionArgument[] = [];

          if (expectedParametersCount > 0) {
            let expectedParameterIndex = 0;
            for (const [actualParameterIndex, actualParameter] of actualParameters.entries()) {
              if (expectedParameterIndex >= expectedParametersCount) {
                parametersToKeep.push(actualParameter);
                continue;
              }

              const expectedParameter = signatureParameters[expectedParameterIndex];
              assert.ok(expectedParameter, 'Expected parameter not found.');

              const expectedType = typeChecker.getTypeOfSymbol(expectedParameter);
              const actualType = typeChecker.getTypeAtLocation(
                parserServices.esTreeNodeToTSNodeMap.get(actualParameter),
              );

              // eslint-disable-next-line no-console
              log(
                'expected type: #',
                expectedParameterIndex,
                expectedParameter.escapedName,
                typeChecker.typeToString(expectedType),
              );
              // eslint-disable-next-line no-console
              log(
                'actual type: #',
                actualParameterIndex,
                sourceCode.getText(actualParameter),
                typeChecker.typeToString(actualType),
              );
              // @ts-expect-error: internal API
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              if (typeChecker.isTypeAssignableTo(actualType, expectedType) === true) {
                parametersToKeep.push(actualParameter);
                expectedParameterIndex++;
                log('matched');
              } else {
                log('not matched');
              }
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
