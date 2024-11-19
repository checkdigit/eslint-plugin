// agent/no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import type {
  AwaitExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  MemberExpression,
  Node,
  ObjectExpression,
  ObjectPattern,
  ReturnStatement,
  SimpleCallExpression,
  VariableDeclaration,
} from 'estree';
import { type Rule, type Scope, SourceCode } from 'eslint';

import {
  getEnclosingFunction,
  getEnclosingScopeNode,
  getEnclosingStatement,
  getParent,
  isUsedInArrayOrAsArgument,
} from '../library/tree';
import getDocumentationUrl from '../get-documentation-url';
import { getIndentation } from '../library/format';
import { isValidPropertyName } from '../library/variable';
import { analyzeResponseReferences } from './response-reference';
import { getResponseBodyRetrievalText, getResponseHeadersRetrievalText, hasAssertions } from './fetch';
import { replaceEndpointUrlPrefixWithBasePath } from './url';

export const ruleId = 'no-fixture';

interface FixtureCallInformation {
  rootNode: AwaitExpression | ReturnStatement | VariableDeclaration | SimpleCallExpression | ExpressionStatement;
  fixtureNode: AwaitExpression | SimpleCallExpression;
  variableDeclaration?: VariableDeclaration;
  variableAssignment?: ExpressionStatement;
  requestBody?: Expression;
  requestHeaders?: { name: Expression; value: Expression }[];
  requestHeadersObjectLiteral?: ObjectExpression;
  assertions?: Expression[][];
  inlineStatementNode?: Node;
  inlineBodyReference?: MemberExpression;
  inlineHeadersReference?: MemberExpression;
}

// recursively analyze the fixture/supertest call chain to collect information of request/response
// eslint-disable-next-line sonarjs/cognitive-complexity
function analyzeFixtureCall(call: SimpleCallExpression, results: FixtureCallInformation, sourceCode: SourceCode) {
  const parent = getParent(call);
  assert.ok(parent, 'parent should exist for fixture/supertest call node');

  let nextCall;
  if (parent.type === 'ReturnStatement') {
    // direct return, no variable declaration or await
    results.fixtureNode = call;
    results.rootNode = parent;
  } else if (
    parent.type === 'ArrayExpression' ||
    parent.type === 'CallExpression' ||
    parent.type === 'ArrowFunctionExpression'
  ) {
    // direct return, no variable declaration or await
    results.fixtureNode = call;
    results.rootNode = call;
  } else if (parent.type === 'AwaitExpression') {
    results.fixtureNode = call;
    const enclosingStatement = getEnclosingStatement(parent);
    assert.ok(enclosingStatement);
    const awaitParent = getParent(parent);
    if (awaitParent?.type === 'MemberExpression') {
      results.rootNode = parent;
      results.inlineStatementNode = enclosingStatement;
      if (awaitParent.property.type === 'Identifier' && awaitParent.property.name === 'body') {
        results.inlineBodyReference = awaitParent;
      }
      if (
        awaitParent.property.type === 'Identifier' &&
        (awaitParent.property.name === 'header' || awaitParent.property.name === 'headers')
      ) {
        results.inlineHeadersReference = awaitParent;
      }
    } else if (enclosingStatement.type === 'VariableDeclaration') {
      results.variableDeclaration = enclosingStatement;
      results.rootNode = enclosingStatement;
    } else if (
      enclosingStatement.type === 'ExpressionStatement' &&
      enclosingStatement.expression.type === 'AssignmentExpression'
    ) {
      results.variableAssignment = enclosingStatement;
      results.rootNode = enclosingStatement;
    } else {
      results.rootNode = parent;
    }
  } else if (parent.type === 'MemberExpression' && parent.property.type === 'Identifier') {
    if (parent.property.name === 'expect') {
      // supertest assertions
      const assertionCall = getParent(parent);
      assert.ok(assertionCall && assertionCall.type === 'CallExpression');
      results.assertions = [...(results.assertions ?? []), assertionCall.arguments as Expression[]];
      nextCall = assertionCall;
    } else if (parent.property.name === 'send') {
      // request body
      const sendRequestBodyCall = getParent(parent);
      assert.ok(sendRequestBodyCall && sendRequestBodyCall.type === 'CallExpression');
      results.requestBody = sendRequestBodyCall.arguments[0] as Expression;
      nextCall = sendRequestBodyCall;
    } else if (parent.property.name === 'set') {
      // request headers
      const setRequestHeaderCall = getParent(parent);
      assert.ok(setRequestHeaderCall && setRequestHeaderCall.type === 'CallExpression');
      const [arg1, arg2] = setRequestHeaderCall.arguments as [Expression, Expression];
      if (arg1.type === 'ObjectExpression') {
        results.requestHeadersObjectLiteral = arg1;
      } else {
        results.requestHeaders = [...(results.requestHeaders ?? []), { name: arg1, value: arg2 }];
      }
      nextCall = setRequestHeaderCall;
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
  destructuringResponseHeadersVariable: Scope.Variable | undefined,
) {
  let statusAssertion: string | undefined;
  const nonStatusAssertions: string[] = [];
  for (const expectArguments of fixtureCallInformation.assertions ?? []) {
    if (expectArguments.length === 1) {
      const [assertionArgument] = expectArguments;
      assert.ok(assertionArgument);
      if (
        (assertionArgument.type === 'MemberExpression' &&
          assertionArgument.object.type === 'Identifier' &&
          assertionArgument.object.name === 'StatusCodes') ||
        assertionArgument.type === 'Literal' ||
        sourceCode.getText(assertionArgument).includes('StatusCodes.')
      ) {
        // status code assertion
        statusAssertion = `assert.equal(${responseVariableName}.status, ${sourceCode.getText(assertionArgument)})`;
      } else if (assertionArgument.type === 'ArrowFunctionExpression') {
        // callback assertion using arrow function
        let functionBody = sourceCode.getText(assertionArgument.body);

        const [originalResponseArgument] = assertionArgument.params;
        assert.ok(originalResponseArgument?.type === 'Identifier');
        const originalResponseArgumentName = originalResponseArgument.name;
        if (originalResponseArgumentName !== responseVariableName) {
          functionBody = functionBody.replace(
            new RegExp(`\\b${originalResponseArgumentName}\\b`, 'ug'),
            responseVariableName,
          );
        }
        nonStatusAssertions.push(`assert.doesNotThrow(()=>${functionBody})`);
      } else if (assertionArgument.type === 'Identifier') {
        // callback assertion using function reference
        nonStatusAssertions.push(
          `assert.doesNotThrow(()=>${sourceCode.getText(assertionArgument)}(${responseVariableName}))`,
        );
      } else if (assertionArgument.type === 'ObjectExpression' || assertionArgument.type === 'CallExpression') {
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
      if (headerValue.type === 'Literal' && headerValue.value instanceof RegExp) {
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
  scopeManager: Scope.ScopeManager,
  fixtureCallInformation: FixtureCallInformation,
  scopeVariablesMap: Map<Scope.Scope, string[]>,
) {
  if (fixtureCallInformation.variableAssignment) {
    assert.ok(
      fixtureCallInformation.variableAssignment.expression.type === 'AssignmentExpression' &&
        fixtureCallInformation.variableAssignment.expression.left.type === 'Identifier',
    );
    return fixtureCallInformation.variableAssignment.expression.left.name;
  }

  if (fixtureCallInformation.variableDeclaration) {
    const firstDeclaration = fixtureCallInformation.variableDeclaration.declarations[0];
    if (firstDeclaration && firstDeclaration.id.type === 'Identifier') {
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
    responseVariableCounter++;
    responseVariableNameToUse = `response${responseVariableCounter === 1 ? '' : responseVariableCounter.toString()}`;
    if (scopeVariables.includes(responseVariableNameToUse)) {
      responseVariableNameToUse = undefined;
    }
  }
  scopeVariables.push(responseVariableNameToUse);
  return responseVariableNameToUse;
}

function isResponseBodyRedefinition(responseBodyReference: MemberExpression): boolean {
  const parent = getParent(responseBodyReference);
  return parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier';
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch API over customized fixture API.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      preferNativeFetch: 'Prefer native fetch API over customized fixture API.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  // eslint-disable-next-line max-lines-per-function
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    const scopeVariablesMap = new Map<Scope.Scope, string[]>();

    return {
      // eslint-disable-next-line max-lines-per-function
      'CallExpression[callee.object.object.name="fixture"][callee.object.property.name="api"]': (
        fixtureCall: CallExpression,
        // eslint-disable-next-line sonarjs/cognitive-complexity
      ) => {
        try {
          if (
            hasAssertions(fixtureCall) &&
            (isUsedInArrayOrAsArgument(fixtureCall) || getEnclosingFunction(fixtureCall)?.async === false)
          ) {
            // skip and leave it to "fetch-then" rule to handle it because no "await" can be used here
            return;
          }

          assert.ok(fixtureCall.type === 'CallExpression');
          const fixtureFunction = fixtureCall.callee; // e.g. fixture.api.get
          assert.ok(fixtureFunction.type === 'MemberExpression');
          const indentation = getIndentation(fixtureCall, sourceCode);

          const [urlArgumentNode] = fixtureCall.arguments; // e.g. `/sample-service/v1/ping`
          assert.ok(urlArgumentNode !== undefined);

          const fixtureCallInformation = {} as FixtureCallInformation;
          analyzeFixtureCall(fixtureCall, fixtureCallInformation, sourceCode);

          const {
            variable: responseVariable,
            bodyReferences: responseBodyReferences,
            headersReferences: responseHeadersReferences,
            statusReferences: responseStatusReferences,
            destructuringBodyVariable: destructuringResponseBodyVariable,
            destructuringHeadersVariable: destructuringResponseHeadersVariable,
          } = analyzeResponseReferences(fixtureCallInformation.variableDeclaration, scopeManager);

          // convert url from `/sample-service/v1/ping` to `${BASE_PATH}/ping`
          const originalUrlArgumentText = sourceCode.getText(urlArgumentNode);
          const fetchUrlArgumentText = replaceEndpointUrlPrefixWithBasePath(originalUrlArgumentText);

          // fetch request argument
          const methodNode = fixtureFunction.property; // get/put/etc.
          assert.ok(methodNode.type === 'Identifier');
          const methodName = methodNode.name.toUpperCase();

          const fetchRequestArgumentLines = [
            '{',
            `  method: '${methodName === 'DEL' ? 'DELETE' : methodName}',`,
            ...(fixtureCallInformation.requestBody
              ? [`  body: JSON.stringify(${sourceCode.getText(fixtureCallInformation.requestBody)}),`]
              : []),
            // eslint-disable-next-line no-nested-ternary
            ...(fixtureCallInformation.requestHeadersObjectLiteral
              ? [`  headers: ${sourceCode.getText(fixtureCallInformation.requestHeadersObjectLiteral)},`]
              : fixtureCallInformation.requestHeaders
                ? [
                    `  headers: {`,
                    ...fixtureCallInformation.requestHeaders.map(
                      ({ name, value }) =>
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, no-nested-ternary, sonarjs/no-nested-template-literals
                        `    ${name.type === 'Literal' ? (isValidPropertyName(name.value) ? name.value : `'${name.value}'`) : `[${sourceCode.getText(name)}]`}: ${sourceCode.getText(value)},`,
                    ),
                    `  },`,
                  ]
                : []),
            '}',
          ].join(`\n${indentation}`);

          const responseVariableNameToUse = getResponseVariableNameToUse(
            scopeManager,
            fixtureCallInformation,
            scopeVariablesMap,
          );

          const isResponseBodyVariableRedefinitionNeeded =
            destructuringResponseBodyVariable !== undefined ||
            fixtureCallInformation.inlineBodyReference !== undefined ||
            (responseBodyReferences.length > 0 && !responseBodyReferences.some(isResponseBodyRedefinition));
          const redefineResponseBodyVariableName = `${responseVariableNameToUse}Body`;

          const isResponseHeadersVariableRedefinitionNeeded =
            (destructuringResponseHeadersVariable !== undefined &&
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              (destructuringResponseHeadersVariable as ObjectPattern).type === 'ObjectPattern') ||
            fixtureCallInformation.inlineHeadersReference !== undefined;
          const redefineResponseHeadersVariableName = `${responseVariableNameToUse}Headers`;

          const isResponseVariableRedefinitionNeeded =
            (fixtureCallInformation.variableAssignment === undefined &&
              responseVariable === undefined &&
              fixtureCallInformation.assertions !== undefined) ||
            isResponseBodyVariableRedefinitionNeeded ||
            isResponseHeadersVariableRedefinitionNeeded;

          const responseBodyHeadersVariableRedefineLines = isResponseVariableRedefinitionNeeded
            ? [
                // eslint-disable-next-line no-nested-ternary
                ...(destructuringResponseBodyVariable
                  ? [
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${(destructuringResponseBodyVariable as ObjectPattern).type === 'ObjectPattern' ? sourceCode.getText(destructuringResponseBodyVariable as ObjectPattern) : (destructuringResponseBodyVariable as Scope.Variable).name} = ${getResponseBodyRetrievalText(responseVariableNameToUse)}`,
                    ]
                  : isResponseBodyVariableRedefinitionNeeded
                    ? [
                        `const ${redefineResponseBodyVariableName} = ${getResponseBodyRetrievalText(responseVariableNameToUse)}`,
                      ]
                    : []),
                // eslint-disable-next-line no-nested-ternary
                ...(destructuringResponseHeadersVariable
                  ? // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    (destructuringResponseHeadersVariable as ObjectPattern).type === 'ObjectPattern'
                    ? (destructuringResponseHeadersVariable as ObjectPattern).properties.map((property) => {
                        assert.ok(property.type === 'Property');
                        assert.equal(property.value.type, 'Identifier');
                        // eslint-disable-next-line sonarjs/no-nested-template-literals
                        return `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${property.value.name} = ${getResponseHeadersRetrievalText(responseVariableNameToUse)}.get(${property.key.type === 'Literal' ? sourceCode.getText(property.key) : `'${sourceCode.getText(property.key)}'`})`;
                      })
                    : [
                        `${fixtureCallInformation.variableDeclaration?.kind ?? 'const'} ${(destructuringResponseHeadersVariable as Scope.Variable).name} = ${getResponseHeadersRetrievalText(responseVariableNameToUse)}`,
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
            destructuringResponseHeadersVariable as Scope.Variable | undefined,
          );

          // add variable declaration if needed
          const fetchCallText = `fetch(${fetchUrlArgumentText}, ${fetchRequestArgumentLines})`;
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
            node: fixtureCall,
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

              // handle response headers references
              for (const responseHeadersReference of responseHeadersReferences) {
                const parent = getParent(responseHeadersReference);
                assert.ok(parent);
                let headerName;
                if (parent.type === 'MemberExpression') {
                  const headerNameNode = parent.property;
                  headerName = parent.computed
                    ? sourceCode.getText(headerNameNode)
                    : `'${sourceCode.getText(headerNameNode)}'`;
                } else if (parent.type === 'CallExpression') {
                  const headerNameNode = parent.arguments[0];
                  headerName = sourceCode.getText(headerNameNode);
                }
                assert.ok(headerName !== undefined);
                yield fixer.replaceText(parent, `${responseVariableNameToUse}.headers.get(${headerName})`);
              }

              // convert response.statusCode to response.status
              for (const responseStatusReference of responseStatusReferences) {
                if (
                  responseStatusReference.property.type === 'Identifier' &&
                  responseStatusReference.property.name === 'statusCode'
                ) {
                  yield fixer.replaceText(responseStatusReference.property, `status`);
                }
              }

              // handle direct return statement without await, e.g. "return fixture.api.get(...);"
              if (
                fixtureCallInformation.rootNode.type === 'ReturnStatement' &&
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
            node: fixtureCall,
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
};

export default rule;
