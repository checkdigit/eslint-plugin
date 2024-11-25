// agent/no-supertest.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { Scope, ScopeManager, Variable } from '@typescript-eslint/scope-manager';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

import {
  getEnclosingFunction,
  getEnclosingScopeNode,
  getEnclosingStatement,
  getParent,
  isUsedInArrayOrAsArgument,
} from '../library/ts-tree';
import getDocumentationUrl from '../get-documentation-url';
import { getIndentation } from '../library/format';
import { analyzeResponseReferences } from './response-reference';
import { getResponseBodyRetrievalText, getResponseHeadersRetrievalText, getResponseStatusRetrievalText } from './fetch';

export const ruleId = 'no-supertest';

interface FixtureCallInformation {
  rootNode:
    | TSESTree.AwaitExpression
    | TSESTree.ReturnStatement
    | TSESTree.VariableDeclaration
    | TSESTree.CallExpression
    | TSESTree.ExpressionStatement;
  fixtureNode: TSESTree.AwaitExpression | TSESTree.CallExpression;
  variableDeclaration?: TSESTree.VariableDeclaration;
  variableAssignment?: TSESTree.ExpressionStatement;
  assertions?: TSESTree.Expression[][];
  inlineStatementNode?: TSESTree.Node;
  inlineBodyReference?: TSESTree.MemberExpression;
  inlineStatusReference?: TSESTree.MemberExpression;
  inlineHeadersReference?: TSESTree.MemberExpression;
}

// recursively analyze the fixture/supertest call chain to collect information of request/response
// eslint-disable-next-line sonarjs/cognitive-complexity
function analyzeFixtureCall(call: TSESTree.CallExpression, results: FixtureCallInformation, sourceCode: SourceCode) {
  const parent = getParent(call);
  assert.ok(parent, 'parent should exist for fixture/supertest call node');

  let nextCall;
  if (parent.type === AST_NODE_TYPES.ReturnStatement) {
    // direct return, no variable declaration or await
    results.fixtureNode = call;
    results.rootNode = parent;
  } else if (
    parent.type === AST_NODE_TYPES.ArrayExpression ||
    parent.type === AST_NODE_TYPES.CallExpression ||
    parent.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    // direct return, no variable declaration or await
    results.fixtureNode = call;
    results.rootNode = call;
  } else if (parent.type === AST_NODE_TYPES.AwaitExpression) {
    results.fixtureNode = call;
    const enclosingStatement = getEnclosingStatement(parent);
    assert.ok(enclosingStatement);
    const awaitParent = getParent(parent);
    if (awaitParent?.type === AST_NODE_TYPES.MemberExpression) {
      results.rootNode = parent;
      results.inlineStatementNode = enclosingStatement;
      if (awaitParent.property.type === AST_NODE_TYPES.Identifier && awaitParent.property.name === 'body') {
        results.inlineBodyReference = awaitParent;
      }
      if (
        awaitParent.property.type === AST_NODE_TYPES.Identifier &&
        (awaitParent.property.name === 'status' || awaitParent.property.name === 'statusCode')
      ) {
        results.inlineStatusReference = awaitParent;
      }
      if (
        awaitParent.property.type === AST_NODE_TYPES.Identifier &&
        (awaitParent.property.name === 'header' || awaitParent.property.name === 'headers')
      ) {
        results.inlineHeadersReference = awaitParent;
      }
    } else if (enclosingStatement.type === AST_NODE_TYPES.VariableDeclaration) {
      results.variableDeclaration = enclosingStatement;
      results.rootNode = enclosingStatement;
    } else if (
      enclosingStatement.type === AST_NODE_TYPES.ExpressionStatement &&
      enclosingStatement.expression.type === AST_NODE_TYPES.AssignmentExpression
    ) {
      results.variableAssignment = enclosingStatement;
      results.rootNode = enclosingStatement;
    } else {
      results.rootNode = parent;
    }
  } else if (parent.type === AST_NODE_TYPES.MemberExpression && parent.property.type === AST_NODE_TYPES.Identifier) {
    if (parent.property.name === 'expect') {
      // supertest assertions
      const assertionCall = getParent(parent);
      assert.ok(assertionCall && assertionCall.type === AST_NODE_TYPES.CallExpression);
      results.assertions = [...(results.assertions ?? []), assertionCall.arguments as TSESTree.Expression[]];
      nextCall = assertionCall;
    }
  } else {
    throw new Error(`Unexpected expression in fixture/supertest call ${sourceCode.getText(parent)}.`);
  }
  if (nextCall) {
    analyzeFixtureCall(nextCall, results, sourceCode);
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function createResponseAssertions(
  fixtureCallInformation: FixtureCallInformation,
  sourceCode: SourceCode,
  responseVariableName: string,
  destructuringResponseHeadersVariable: Variable | undefined,
) {
  let statusAssertion: string | undefined;
  const nonStatusAssertions: string[] = [];
  for (const expectArguments of fixtureCallInformation.assertions ?? []) {
    if (expectArguments.length === 1) {
      const [assertionArgument] = expectArguments;
      assert.ok(assertionArgument);
      if (
        (assertionArgument.type === AST_NODE_TYPES.MemberExpression &&
          assertionArgument.object.type === AST_NODE_TYPES.Identifier &&
          assertionArgument.object.name === 'StatusCodes') ||
        assertionArgument.type === AST_NODE_TYPES.Literal ||
        sourceCode.getText(assertionArgument).includes('StatusCodes.')
      ) {
        // status code assertion
        statusAssertion = `assert.equal(${responseVariableName}.status, ${sourceCode.getText(assertionArgument)})`;
      } else if (assertionArgument.type === AST_NODE_TYPES.ArrowFunctionExpression) {
        // callback assertion using arrow function
        let functionBody = sourceCode.getText(assertionArgument.body);

        const [originalResponseArgument] = assertionArgument.params;
        assert.ok(originalResponseArgument?.type === AST_NODE_TYPES.Identifier);
        const originalResponseArgumentName = originalResponseArgument.name;
        if (originalResponseArgumentName !== responseVariableName) {
          functionBody = functionBody.replace(
            new RegExp(`\\b${originalResponseArgumentName}\\b`, 'ug'),
            responseVariableName,
          );
        }
        nonStatusAssertions.push(`assert.doesNotThrow(()=>${functionBody})`);
      } else if (assertionArgument.type === AST_NODE_TYPES.Identifier) {
        // callback assertion using function reference
        nonStatusAssertions.push(
          `assert.doesNotThrow(()=>${sourceCode.getText(assertionArgument)}(${responseVariableName}))`,
        );
      } else if (
        assertionArgument.type === AST_NODE_TYPES.ObjectExpression ||
        assertionArgument.type === AST_NODE_TYPES.CallExpression
      ) {
        // body deep equal assertion
        nonStatusAssertions.push(
          `assert.deepEqual(await ${responseVariableName}.json(), ${sourceCode.getText(assertionArgument)})`,
        );
      } else {
        throw new Error(`Unexpected Supertest assertion argument: ".expect(${sourceCode.getText(assertionArgument)})`);
      }
    } else if (expectArguments.length === 2) {
      // header assertion
      const [headerName, headerValue] = expectArguments;
      assert.ok(headerName && headerValue);
      const headersReference =
        destructuringResponseHeadersVariable !== undefined
          ? destructuringResponseHeadersVariable.name
          : `${responseVariableName}.headers`;
      if (headerValue.type === AST_NODE_TYPES.Literal && headerValue.value instanceof RegExp) {
        nonStatusAssertions.push(
          `assert.ok(${headersReference}.get(${sourceCode.getText(headerName)}).match(${sourceCode.getText(headerValue)}))`,
        );
      } else {
        nonStatusAssertions.push(
          `assert.equal(${headersReference}.get(${sourceCode.getText(headerName)}), ${sourceCode.getText(headerValue)})`,
        );
      }
    }
  }
  return {
    statusAssertion,
    nonStatusAssertions,
  };
}

function getResponseVariableNameToUse(
  supertestFunctionName: string,
  scopeManager: ScopeManager,
  fixtureCallInformation: FixtureCallInformation,
  scopeVariablesMap: Map<Scope, string[]>,
) {
  if (fixtureCallInformation.variableAssignment) {
    assert.ok(
      fixtureCallInformation.variableAssignment.expression.type === AST_NODE_TYPES.AssignmentExpression &&
        fixtureCallInformation.variableAssignment.expression.left.type === AST_NODE_TYPES.Identifier,
    );
    return fixtureCallInformation.variableAssignment.expression.left.name;
  }

  if (fixtureCallInformation.variableDeclaration) {
    const firstDeclaration = fixtureCallInformation.variableDeclaration.declarations[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (firstDeclaration !== undefined && firstDeclaration.id.type === AST_NODE_TYPES.Identifier) {
      return firstDeclaration.id.name;
    }
  }

  const enclosingScopeNode = getEnclosingScopeNode(fixtureCallInformation.rootNode);
  scopeManager.getDeclaredVariables(fixtureCallInformation.rootNode);
  assert.ok(enclosingScopeNode);
  const scope = scopeManager.acquire(enclosingScopeNode);
  assert.ok(scope !== null);
  let scopeVariables = scopeVariablesMap.get(scope);
  if (!scopeVariables) {
    scopeVariables = [...scope.set.keys()];
    scopeVariablesMap.set(scope, scopeVariables);
  }

  let responseVariableCounter = 0;
  let responseVariableNameToUse;
  while (responseVariableNameToUse === undefined) {
    responseVariableNameToUse = `${supertestFunctionName}Response${responseVariableCounter === 0 ? '' : responseVariableCounter.toString()}`;
    if (scopeVariables.includes(responseVariableNameToUse)) {
      responseVariableNameToUse = undefined;
    }
    responseVariableCounter++;
  }
  scopeVariables.push(responseVariableNameToUse);
  return responseVariableNameToUse;
}

function isResponseBodyRedefinition(responseBodyReference: TSESTree.MemberExpression): boolean {
  const parent = getParent(responseBodyReference);
  return parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier;
}

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'unknownError' | 'preferNativeFetch'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Transform supertest assersions to regular node assertions.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      preferNativeFetch: 'Transform supertest assersions to regular node assertions.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  // eslint-disable-next-line max-lines-per-function
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    assert.ok(scopeManager !== null);
    const scopeVariablesMap = new Map<Scope, string[]>();

    return {
      // eslint-disable-next-line max-lines-per-function
      'CallExpression[callee.property.name="expect"]': (
        supertestCall: TSESTree.CallExpression,
        // eslint-disable-next-line sonarjs/cognitive-complexity
      ) => {
        try {
          assert.ok(supertestCall.callee.type === AST_NODE_TYPES.MemberExpression);
          if (
            supertestCall.callee.object.type !== AST_NODE_TYPES.CallExpression ||
            (supertestCall.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
              supertestCall.callee.object.callee.property.type === AST_NODE_TYPES.Identifier &&
              supertestCall.callee.object.callee.property.name === 'expect')
          ) {
            // skip nested expect call chain, only focus on the first expect call
            return;
          }
          if (
            supertestCall.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
            supertestCall.callee.object.callee.object.type === AST_NODE_TYPES.MemberExpression &&
            supertestCall.callee.object.callee.object.object.type === AST_NODE_TYPES.Identifier &&
            supertestCall.callee.object.callee.object.object.name === 'fixture' &&
            supertestCall.callee.object.callee.object.property.type === AST_NODE_TYPES.Identifier &&
            supertestCall.callee.object.callee.object.property.name === 'api'
          ) {
            // skip nested expect calls, only focus on the top level
            return;
          }

          const fullSupertestFunctionName = sourceCode.getText(supertestCall.callee.object.callee);
          const supertestFunctionName = fullSupertestFunctionName.split('.').pop();
          assert.ok(supertestFunctionName !== undefined);

          if (isUsedInArrayOrAsArgument(supertestCall) || getEnclosingFunction(supertestCall)?.async === false) {
            // skip and leave it to "fetch-then" rule to handle it because no "await" can be used here
            return;
          }

          const indentation = getIndentation(supertestCall, sourceCode);

          const fixtureCallInformation = {} as FixtureCallInformation;
          const fixtureFunction = supertestCall.callee.object;
          analyzeFixtureCall(fixtureFunction, fixtureCallInformation, sourceCode);
          fixtureCallInformation.assertions?.flat().map((ass) => sourceCode.getText(ass));

          const {
            variable: responseVariable,
            bodyReferences: responseBodyReferences,
            // headersReferences: responseHeadersReferences,
            statusReferences: responseStatusReferences,
            destructuringBodyVariable: destructuringResponseBodyVariable,
            destructuringHeadersVariable: destructuringResponseHeadersVariable,
            destructuringStatusVariable: destructuringResponseStatusVariable,
          } = analyzeResponseReferences(fixtureCallInformation.variableDeclaration, scopeManager);

          const responseVariableNameToUse = getResponseVariableNameToUse(
            supertestFunctionName,
            scopeManager,
            fixtureCallInformation,
            scopeVariablesMap,
          );

          const isResponseBodyVariableRedefinitionNeeded =
            destructuringResponseBodyVariable !== undefined ||
            fixtureCallInformation.inlineBodyReference !== undefined ||
            (responseBodyReferences.length > 0 && !responseBodyReferences.some(isResponseBodyRedefinition));
          const redefineResponseBodyVariableName = `${responseVariableNameToUse}Body`;

          const isResponseStatusVariableRedefinitionNeeded =
            destructuringResponseStatusVariable !== undefined ||
            fixtureCallInformation.inlineStatusReference !== undefined;
          const redefineResponseStatusVariableName = `${responseVariableNameToUse}Status`;

          const isResponseHeadersVariableRedefinitionNeeded =
            (destructuringResponseHeadersVariable !== undefined &&
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              (destructuringResponseHeadersVariable as TSESTree.ObjectPattern).type === AST_NODE_TYPES.ObjectPattern) ||
            fixtureCallInformation.inlineHeadersReference !== undefined;
          const redefineResponseHeadersVariableName = `${responseVariableNameToUse}Headers`;

          const isResponseVariableRedefinitionNeeded =
            (fixtureCallInformation.variableAssignment === undefined &&
              responseVariable === undefined &&
              fixtureCallInformation.assertions !== undefined) ||
            isResponseBodyVariableRedefinitionNeeded ||
            isResponseStatusVariableRedefinitionNeeded ||
            isResponseHeadersVariableRedefinitionNeeded;

          const responseBodyHeadersVariableRedefineLines = isResponseVariableRedefinitionNeeded
            ? [
                // eslint-disable-next-line no-nested-ternary
                ...(destructuringResponseBodyVariable
                  ? [
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${(destructuringResponseBodyVariable as TSESTree.ObjectPattern).type === AST_NODE_TYPES.ObjectPattern ? sourceCode.getText(destructuringResponseBodyVariable as TSESTree.ObjectPattern) : (destructuringResponseBodyVariable as Variable).name} = ${getResponseBodyRetrievalText(responseVariableNameToUse)}`,
                    ]
                  : isResponseBodyVariableRedefinitionNeeded
                    ? [
                        `const ${redefineResponseBodyVariableName} = ${getResponseBodyRetrievalText(responseVariableNameToUse)}`,
                      ]
                    : []),
                // eslint-disable-next-line no-nested-ternary
                ...(destructuringResponseStatusVariable
                  ? [
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${(destructuringResponseStatusVariable as TSESTree.ObjectPattern).type === AST_NODE_TYPES.ObjectPattern ? sourceCode.getText(destructuringResponseStatusVariable as TSESTree.ObjectPattern) : (destructuringResponseStatusVariable as Variable).name} = ${getResponseStatusRetrievalText(responseVariableNameToUse)}`,
                    ]
                  : isResponseStatusVariableRedefinitionNeeded
                    ? [
                        `const ${redefineResponseStatusVariableName} = ${getResponseStatusRetrievalText(responseVariableNameToUse)}`,
                      ]
                    : []),
                // eslint-disable-next-line no-nested-ternary
                ...(destructuringResponseHeadersVariable
                  ? // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    (destructuringResponseHeadersVariable as TSESTree.ObjectPattern).type ===
                    AST_NODE_TYPES.ObjectPattern
                    ? (destructuringResponseHeadersVariable as TSESTree.ObjectPattern).properties.map((property) => {
                        assert.ok(property.type === AST_NODE_TYPES.Property);
                        assert.ok(property.value.type === AST_NODE_TYPES.Identifier);
                        // eslint-disable-next-line sonarjs/no-nested-template-literals
                        return `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${property.value.name} = ${getResponseHeadersRetrievalText(responseVariableNameToUse)}.get(${property.key.type === AST_NODE_TYPES.Literal ? sourceCode.getText(property.key) : `'${sourceCode.getText(property.key)}'`})`;
                      })
                    : [
                        `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${(destructuringResponseHeadersVariable as Variable).name} = ${getResponseHeadersRetrievalText(responseVariableNameToUse)}`,
                      ]
                  : isResponseHeadersVariableRedefinitionNeeded
                    ? [
                        `const ${redefineResponseHeadersVariableName} = ${getResponseHeadersRetrievalText(responseVariableNameToUse)}`,
                      ]
                    : []),
              ]
            : [];

          const { statusAssertion, nonStatusAssertions } = createResponseAssertions(
            fixtureCallInformation,
            sourceCode,
            responseVariableNameToUse,
            destructuringResponseHeadersVariable as Variable | undefined,
          );

          // add variable declaration if needed
          const fetchCallText = sourceCode.getText(fixtureFunction);
          const fetchStatementText = !isResponseVariableRedefinitionNeeded
            ? fetchCallText
            : `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${responseVariableNameToUse} = await ${fetchCallText}`;

          const nodeToReplace = isResponseVariableRedefinitionNeeded
            ? fixtureCallInformation.rootNode
            : fixtureCallInformation.fixtureNode;
          const appendingAssignmentAndAssertionText = [
            '',
            ...(statusAssertion !== undefined ? [statusAssertion] : []),
            ...responseBodyHeadersVariableRedefineLines,
            ...nonStatusAssertions,
          ].join(`;\n${indentation}`);

          context.report({
            node: supertestCall,
            messageId: 'preferNativeFetch',

            *fix(fixer) {
              if (fixtureCallInformation.inlineStatementNode) {
                const preInlineDeclaration = [
                  fetchStatementText,
                  `${appendingAssignmentAndAssertionText};\n${indentation}`,
                ].join(``);
                yield fixer.insertTextBefore(fixtureCallInformation.inlineStatementNode, preInlineDeclaration);
              } else {
                yield fixer.replaceText(nodeToReplace, fetchStatementText);

                const needEndingSemiColon = sourceCode.getText(nodeToReplace).endsWith(';');
                yield fixer.insertTextAfter(
                  nodeToReplace,
                  needEndingSemiColon ? `${appendingAssignmentAndAssertionText};` : appendingAssignmentAndAssertionText,
                );
              }

              // handle response body references
              for (const responseBodyReference of responseBodyReferences) {
                yield fixer.replaceText(
                  responseBodyReference,
                  isResponseBodyVariableRedefinitionNeeded || !isResponseBodyRedefinition(responseBodyReference)
                    ? redefineResponseBodyVariableName
                    : getResponseBodyRetrievalText(responseVariableNameToUse),
                );
              }
              if (fixtureCallInformation.inlineBodyReference) {
                yield fixer.replaceText(fixtureCallInformation.inlineBodyReference, redefineResponseBodyVariableName);
              }

              // // handle response headers references
              // for (const responseHeadersReference of responseHeadersReferences) {
              //   const parent = getParent(responseHeadersReference);
              //   assert.ok(parent);
              //   let headerName;
              //   if (parent.type === AST_NODE_TYPES.MemberExpression) {
              //     const headerNameNode = parent.property;
              //     headerName = parent.computed
              //       ? sourceCode.getText(headerNameNode)
              //       : `'${sourceCode.getText(headerNameNode)}'`;
              //   } else if (parent.type === AST_NODE_TYPES.CallExpression) {
              //     const headerNameNode = parent.arguments[0];
              //     headerName = sourceCode.getText(headerNameNode);
              //   }
              //   assert.ok(headerName !== undefined);
              //   yield fixer.replaceText(parent, `${responseVariableNameToUse}.headers.get(${headerName})`);
              // }

              // convert response.statusCode to response.status
              for (const responseStatusReference of responseStatusReferences) {
                if (
                  responseStatusReference.property.type === AST_NODE_TYPES.Identifier &&
                  responseStatusReference.property.name === 'statusCode'
                ) {
                  yield fixer.replaceText(responseStatusReference.property, `status`);
                }
              }

              // handle direct return statement without await, e.g. "return fixture.api.get(...);"
              if (
                fixtureCallInformation.rootNode.type === AST_NODE_TYPES.ReturnStatement &&
                fixtureCallInformation.assertions !== undefined
              ) {
                yield fixer.insertTextAfter(
                  fixtureCallInformation.rootNode,
                  `\n${indentation}return ${responseVariableNameToUse};`,
                );
              }
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: supertestCall,
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
