// no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/* eslint-disable no-console */

import type {
  AwaitExpression,
  CallExpression,
  Expression,
  MemberExpression,
  Node,
  ReturnStatement,
  SimpleCallExpression,
  VariableDeclaration,
} from 'estree';
import type { Rule, Scope, SourceCode } from 'eslint';
import { getAncestor, getParent } from './ast/tree';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from './get-documentation-url';
import { getIndentation } from './ast/format';

export const ruleId = 'no-fixture';

interface FixtureCallInformation {
  rootNode: AwaitExpression | ReturnStatement | VariableDeclaration;
  fixtureNode: AwaitExpression | SimpleCallExpression;
  variableDeclaration?: VariableDeclaration;
  requestBody?: Expression;
  requestHeaders?: { name: Expression; value: Expression }[];
  assertions?: Expression[][];
}

// recursively analyze the fixture/supertest call chain to collect information of request/response
function analyzeFixtureCall(call: SimpleCallExpression, results: FixtureCallInformation) {
  const parent = getParent(call);
  assert.ok(parent, 'parent should exist for fixture/supertest call node');

  let nextCall;
  if (parent.type === 'ReturnStatement') {
    // direct return, no variable declaration / await
    results.fixtureNode = call;
    results.rootNode = parent;
  } else if (parent.type === 'AwaitExpression') {
    results.fixtureNode = call;
    // [TODO:] should we consider variable declaration without await??
    const variableDeclaration = getAncestor(parent, 'VariableDeclaration', 'FunctionDeclaration');
    if (variableDeclaration?.type === 'VariableDeclaration') {
      results.variableDeclaration = variableDeclaration;
      results.rootNode = variableDeclaration;
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
      const [name, value] = setRequestHeaderCall.arguments as [Expression, Expression];
      results.requestHeaders = [...(results.requestHeaders ?? []), { name, value }];
      nextCall = setRequestHeaderCall;
    }
  } else {
    throw new Error(`Unexpected expression in fixture/supertest call ${String(parent)}`);
  }
  if (nextCall) {
    analyzeFixtureCall(nextCall, results);
  }
}

// analyze response related variables and their references0
function analyzeResponseReferences(fixtureInformation: FixtureCallInformation, scopeManager: Scope.ScopeManager) {
  const results: {
    variable?: Scope.Variable;
    bodyReferences: MemberExpression[];
    headersReferences: MemberExpression[];
    statusReferences: MemberExpression[];
    spreadBodyVariable?: Scope.Variable;
    spreadHeadersVariable?: Scope.Variable;
  } = {
    bodyReferences: [],
    headersReferences: [],
    statusReferences: [],
  };

  if (fixtureInformation.variableDeclaration) {
    const responseVariables = scopeManager.getDeclaredVariables(fixtureInformation.variableDeclaration);
    for (const responseVariable of responseVariables) {
      const identifier = responseVariable.identifiers[0];
      assert.ok(identifier);
      const identifierParent = getParent(identifier);
      assert.ok(identifierParent);
      if (identifierParent.type === 'VariableDeclarator') {
        // e.g. const response = ...
        results.variable = responseVariable;
        // e.g. response.body
        results.bodyReferences = responseVariable.references
          .map((responseBodyReference) => getParent(responseBodyReference.identifier))
          .filter(
            (node): node is MemberExpression =>
              node !== null &&
              node !== undefined &&
              node.type === 'MemberExpression' &&
              node.property.type === 'Identifier' &&
              node.property.name === 'body',
          );
        // e.g. response.headers / response.header / response.get()
        results.headersReferences = responseVariable.references
          .map((responseHeadersReference) => getParent(responseHeadersReference.identifier))
          .filter(
            (node): node is MemberExpression =>
              node !== null &&
              node !== undefined &&
              node.type === 'MemberExpression' &&
              node.property.type === 'Identifier' &&
              (node.property.name === 'header' || node.property.name === 'headers' || node.property.name === 'get'),
          );
        // e.g. response.status / response.statusCode
        results.statusReferences = responseVariable.references
          .map((responseHeadersReference) => getParent(responseHeadersReference.identifier))
          .filter(
            (node): node is MemberExpression =>
              node !== null &&
              node !== undefined &&
              node.type === 'MemberExpression' &&
              node.property.type === 'Identifier' &&
              (node.property.name === 'status' || node.property.name === 'statusCode'),
          );
      } else if (
        // body reference through destruction/renaming, e.g. "const { body } = ..."
        identifierParent.type === 'Property' &&
        identifierParent.key.type === 'Identifier' &&
        identifierParent.key.name === 'body'
      ) {
        results.spreadBodyVariable = responseVariable;
      } else if (
        // header reference through destruction/renaming, e.g. "const { headers } = ..."
        identifierParent.type === 'Property' &&
        identifierParent.key.type === 'Identifier' &&
        identifierParent.key.name === 'headers'
      ) {
        results.spreadHeadersVariable = responseVariable;
      } else {
        throw new Error(`Unknown response variable reference: ${responseVariable.name}`);
      }
    }
  }
  return results;
}

// `/sample-service/v1/ping` -> `${BASE_PATH}/ping`
function replaceEndpointUrlPrefixWithBasePath(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/`\/\w+(?<parts>-\w+)*\/v\d+\//u, '`${BASE_PATH}/');
}

function isValidPropertyName(name: unknown) {
  return typeof name === 'string' && /^[a-zA-Z_$][a-zA-Z_$0-9]*$/u.test(name);
}

function createResponseAssertions(
  fixtureCallInformation: FixtureCallInformation,
  sourceCode: SourceCode,
  variableName: string,
) {
  // [TODO:] make sure status assertion is ordered as the first
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
        assertionArgument.type === 'Literal'
      ) {
        // status code assertion
        statusAssertion = `assert.equal(${variableName}.status, ${sourceCode.getText(assertionArgument)})`;
      } else if (assertionArgument.type === 'ArrowFunctionExpression') {
        // callback assertion
        nonStatusAssertions.push(`assert.ok(${sourceCode.getText(assertionArgument)})`);
      } else if (assertionArgument.type === 'Identifier') {
        // callback assertion
        nonStatusAssertions.push(`assert.ok(${sourceCode.getText(assertionArgument)}(${variableName}))`);
      } else if (assertionArgument.type === 'ObjectExpression' || assertionArgument.type === 'CallExpression') {
        // body deep equal assertion
        nonStatusAssertions.push(
          `assert.deepEqual(await ${variableName}.json(), ${sourceCode.getText(assertionArgument)})`,
        );
      } else {
        throw new Error(`Unexpected Supertest assertion argument: ".expect(${sourceCode.getText(assertionArgument)})`);
      }
    } else if (expectArguments.length === 2) {
      // header assertion
      const [headerName, headerValue] = expectArguments;
      assert.ok(headerName && headerValue);
      if (headerValue.type === 'Literal' && headerValue.value instanceof RegExp) {
        nonStatusAssertions.push(
          `assert.ok(${variableName}.headers.get(${sourceCode.getText(headerName)}).match(${sourceCode.getText(headerValue)}))`,
        );
      } else {
        nonStatusAssertions.push(
          `assert.equal(${variableName}.headers.get(${sourceCode.getText(headerName)}), ${sourceCode.getText(headerValue)})`,
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
  if (fixtureCallInformation.variableDeclaration) {
    const firstDeclaration = fixtureCallInformation.variableDeclaration.declarations[0];
    // [TODO:] double check if it works for destruction/rename declaration
    if (firstDeclaration && firstDeclaration.id.type === 'Identifier') {
      return firstDeclaration.id.name;
    }
  }

  const closestFunctionExpression = getAncestor(fixtureCallInformation.rootNode, (node: Node) =>
    ['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type),
  );
  scopeManager.getDeclaredVariables(fixtureCallInformation.rootNode); /*?*/
  assert.ok(closestFunctionExpression);
  const scope = scopeManager.acquire(closestFunctionExpression);
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

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch API over customized fixture API.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      preferNativeFetch: 'Prefer native fetch API over customized fixture API.',
      unknownError:
        'Unknown error occurred: {{ error }}. Please manually convert the fixture API call to fetch API call.',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    const scopeVariablesMap = new Map<Scope.Scope, string[]>();

    return {
      'CallExpression[callee.object.object.name="fixture"][callee.object.property.name="api"]': (
        fixtureCall: CallExpression,
      ) => {
        try {
          assert.ok(fixtureCall.type === 'CallExpression');
          const fixtureFunction = fixtureCall.callee; // e.g. fixture.api.get
          assert.ok(fixtureFunction.type === 'MemberExpression');
          const indentation = getIndentation(fixtureCall, sourceCode);

          const [urlArgumentNode] = fixtureCall.arguments; // e.g. `/sample-service/v1/ping`
          assert.ok(urlArgumentNode !== undefined);

          const fixtureCallInformation = {} as FixtureCallInformation;
          analyzeFixtureCall(fixtureCall, fixtureCallInformation);

          const {
            variable: responseVariable,
            bodyReferences: responseBodyReferences,
            headersReferences: responseHeadersReferences,
            statusReferences: responseStatusReferences,
            spreadBodyVariable: spreadResponseBodyVariable,
            spreadHeadersVariable: spreadResponseHeadersVariable,
          } = analyzeResponseReferences(fixtureCallInformation, scopeManager);

          // convert url from `/sample-service/v1/ping` to `${BASE_PATH}/ping`
          const originalUrlArgumentText = sourceCode.getText(urlArgumentNode);
          const fetchUrlArgumentText = replaceEndpointUrlPrefixWithBasePath(originalUrlArgumentText);

          // fetch request argument
          const methodNode = fixtureFunction.property; // get/put/etc.
          assert.ok(methodNode.type === 'Identifier');
          const fetchRequestArgumentLines = [
            '{',
            `  method: '${methodNode.name.toUpperCase()}',`,
            ...(fixtureCallInformation.requestBody
              ? [`  body: JSON.stringify(${sourceCode.getText(fixtureCallInformation.requestBody)}),`]
              : []),
            ...(fixtureCallInformation.requestHeaders
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

          const needResponseVariableRedefine =
            spreadResponseBodyVariable !== undefined ||
            (responseVariable === undefined && fixtureCallInformation.assertions !== undefined);

          const responseBodyHeadersVariableRedefineLines = needResponseVariableRedefine
            ? [
                ...(spreadResponseBodyVariable
                  ? [`const ${spreadResponseBodyVariable.name} = await ${responseVariableNameToUse}.json()`]
                  : []),
                ...(spreadResponseHeadersVariable
                  ? [`const ${spreadResponseHeadersVariable.name} = ${responseVariableNameToUse}.headers`]
                  : []),
              ]
            : [];

          const { statusAssertion, nonStatusAssertions } = createResponseAssertions(
            fixtureCallInformation,
            sourceCode,
            responseVariableNameToUse,
          );

          // add variable declaration if needed
          const fetchCallText = `fetch(${fetchUrlArgumentText}, ${fetchRequestArgumentLines})`;
          const fetchStatementText = !needResponseVariableRedefine
            ? fetchCallText
            : `const ${responseVariableNameToUse} = await ${fetchCallText}`;

          const nodeToReplace = needResponseVariableRedefine
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
              yield fixer.replaceText(nodeToReplace, fetchStatementText);

              const needEndingSemiColon = sourceCode.getText(nodeToReplace).endsWith(';');
              yield fixer.insertTextAfter(
                nodeToReplace,
                needEndingSemiColon ? `${appendingAssignmentAndAssertionText};` : appendingAssignmentAndAssertionText,
              );

              // handle response body references
              for (const responseBodyReference of responseBodyReferences) {
                yield fixer.replaceText(responseBodyReference, `await ${responseVariableNameToUse}.json()`);
              }

              // handle response headers references
              for (const responseHeadersReference of responseHeadersReferences) {
                const parent = getParent(responseHeadersReference);
                assert.ok(parent);
                let headerName;
                if (parent.type === 'MemberExpression') {
                  const headerNameNode = parent.property;
                  headerName =
                    // eslint-disable-next-line no-nested-ternary, @typescript-eslint/restrict-template-expressions
                    parent.computed ? sourceCode.getText(headerNameNode) : `'${sourceCode.getText(headerNameNode)}'`;
                } else if (parent.type === 'CallExpression') {
                  const headerNameNode = parent.arguments[0];
                  headerName = sourceCode.getText(headerNameNode);
                }
                assert.ok(headerName);
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

              // handle direct return without await
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
          console.error(`Failed to apply ${ruleId} rule. Error:`, error);
          context.report({
            node: fixtureCall,
            messageId: 'unknownError',
            data: {
              error: String(error),
            },
          });
        }
      },
    };
  },
};

export default rule;
