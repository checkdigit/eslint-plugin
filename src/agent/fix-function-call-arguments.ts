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
import { getParent } from '../library/ts-tree';

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
          const expectedArgsCount = signatureParameters.length;
          const providedArgs = callExpression.arguments;
          const providedArgsCount = providedArgs.length;
          if (providedArgsCount === 0 || providedArgsCount === expectedArgsCount) {
            return;
          }
          const argsToKeep: TSESTree.CallExpressionArgument[] = [];

          if (expectedArgsCount > 0) {
            let parameterIndex = 0;
            for (const arg of providedArgs) {
              const currentExpectedArg = signatureParameters[parameterIndex];
              assert.ok(currentExpectedArg, 'Expected argument not found.');

              const expectedType = typeChecker.getTypeOfSymbol(currentExpectedArg);
              const actualType = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(arg));

              // eslint-disable-next-line no-console
              log('expected type:', currentExpectedArg.escapedName, typeChecker.typeToString(expectedType));
              // eslint-disable-next-line no-console
              log('actual type:', sourceCode.getText(arg), typeChecker.typeToString(actualType));
              // @ts-expect-error: internal API
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              if (typeChecker.isTypeAssignableTo(actualType, expectedType) === true) {
                argsToKeep.push(arg);
                parameterIndex++;
                log('matched');
              } else {
                log('not matched');
              }
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
