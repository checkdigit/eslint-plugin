// agent/fix-function-call-arguments.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'fix-function-call-arguments';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

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
        try {
          const calleeTsNode = parserServices.esTreeNodeToTSNodeMap.get(callExpression.callee);
          const calleeType = typeChecker.getTypeAtLocation(calleeTsNode);
          const signature = calleeType.getCallSignatures()[0];
          if (!signature) {
            return;
          }

          const signatureParameters = signature.getParameters();
          const expectedArgsCount = signatureParameters.length;
          const providedArgs = callExpression.arguments;
          const providedArgsCount = providedArgs.length;
          if (providedArgsCount === 0 || providedArgsCount === expectedArgsCount) {
            return;
          }
          const argsToKeep: TSESTree.CallExpressionArgument[] = [];

          let parameterIndex = 0;
          for (const arg of providedArgs) {
            const currentExpectedArg = signatureParameters[parameterIndex];
            assert.ok(currentExpectedArg, 'Expected argument not found.');

            const expectedType = typeChecker.getTypeOfSymbol(currentExpectedArg);
            typeChecker.typeToString(expectedType);
            const actualType = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(arg));
            typeChecker.typeToString(actualType);
            // @ts-expect-error: internal API
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            if (typeChecker.isTypeAssignableTo(actualType, expectedType) === true) {
              argsToKeep.push(arg);
              parameterIndex++;
            }
          }

          if (argsToKeep.length === providedArgsCount) {
            return;
          }

          const firstParameter = providedArgs[0];
          const lastParameter = providedArgs.at(-1);
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
                argsToKeep.map((arg) => sourceCode.getText(arg)).join(', '),
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
