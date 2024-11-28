// agent/fetch-then.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

// import { ScopeManager, Variable } from '@typescript-eslint/scope-manager';
import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

import { getEnclosingFunction, getParent, isUsedInArrayOrAsArgument } from '../library/ts-tree';
import getDocumentationUrl from '../get-documentation-url';
import { getIndentation } from '../library/format';
import { isValidPropertyName } from '../library/variable';
import { hasAssertions } from './fetch';
import { replaceEndpointUrlPrefixWithBasePath } from './url';

export const ruleId = 'fetch-then';

interface FixtureCallInformation {
  fixtureNode: TSESTree.CallExpression;
  requestBody?: TSESTree.Expression;
  requestHeaders?: { name: TSESTree.Expression; value: TSESTree.Expression }[];
  assertions?: TSESTree.Expression[][];
}

// recursively analyze the fixture/supertest call chain to collect information of request/response
function analyzeFixtureCall(call: TSESTree.CallExpression, results: FixtureCallInformation, sourceCode: SourceCode) {
  const parent = getParent(call);
  if (!parent) {
    return;
  }

  let nextCall;
  if (parent.type !== AST_NODE_TYPES.MemberExpression) {
    results.fixtureNode = call;
    return;
  }

  if (parent.property.type === AST_NODE_TYPES.Identifier) {
    if (parent.property.name === 'expect') {
      // supertest assertions
      const assertionCall = getParent(parent);
      assert.ok(assertionCall && assertionCall.type === AST_NODE_TYPES.CallExpression);
      results.assertions = [...(results.assertions ?? []), assertionCall.arguments as TSESTree.Expression[]];
      nextCall = assertionCall;
    } else if (parent.property.name === 'send') {
      // request body
      const sendRequestBodyCall = getParent(parent);
      assert.ok(sendRequestBodyCall && sendRequestBodyCall.type === AST_NODE_TYPES.CallExpression);
      results.requestBody = sendRequestBodyCall.arguments[0] as TSESTree.Expression;
      nextCall = sendRequestBodyCall;
    } else if (parent.property.name === 'set') {
      // request headers
      const setRequestHeaderCall = getParent(parent);
      assert.ok(setRequestHeaderCall && setRequestHeaderCall.type === AST_NODE_TYPES.CallExpression);
      const [name, value] = setRequestHeaderCall.arguments as [TSESTree.Expression, TSESTree.Expression];
      results.requestHeaders = [...(results.requestHeaders ?? []), { name, value }];
      nextCall = setRequestHeaderCall;
    }
  } else {
    throw new Error(`Unexpected TSESTree.Expression in fixture/supertest call ${sourceCode.getText(parent)}.`);
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
      const headersReference = `${responseVariableName}.headers`;
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

// function getResponseHeadersAccesses(responseVariables: Variable[], scopeManager: ScopeManager, sourceCode: SourceCode) {
//   const responseHeadersAccesses: TSESTree.MemberExpression[] = [];
//   for (const responseVariable of responseVariables) {
//     for (const responseReference of responseVariable.references) {
//       const responseAccess = getParent(responseReference.identifier);
//       if (!responseAccess || responseAccess.type !== AST_NODE_TYPES.MemberExpression) {
//         continue;
//       }

//       const responseAccessParent = getParent(responseAccess);
//       if (!responseAccessParent) {
//         continue;
//       }

//       if (
//         responseAccessParent.type === AST_NODE_TYPES.CallExpression &&
//         responseAccessParent.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression
//       ) {
//         // map-like operation against responses, e.g. responses.map((response) => response.headers.etag)
//         responseHeadersAccesses.push(
//           ...getResponseHeadersAccesses(
//             scopeManager.getDeclaredVariables(responseAccessParent.arguments[0]),
//             scopeManager,
//             sourceCode,
//           ),
//         );
//         continue;
//       }

//       if (
//         responseAccess.computed &&
//         responseAccess.property.type === AST_NODE_TYPES.Literal &&
//         responseAccessParent.type === AST_NODE_TYPES.MemberExpression
//       ) {
//         // header access through indexed responses array, e.g. responses[0].headers, responses[1].get(...), etc.
//         responseHeadersAccesses.push(responseAccessParent);
//       } else {
//         responseHeadersAccesses.push(responseAccess);
//       }
//     }
//   }
//   return responseHeadersAccesses;
// }

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const rule: ESLintUtils.RuleModule<'unknownError' | 'preferNativeFetch'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch API over customized fixture API.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      preferNativeFetch: 'Prefer native fetch API over customized fixture API.',
      // shouldUseHeaderGetter: 'Getter should be used to access response headers.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    assert.ok(scopeManager);

    return {
      'CallExpression[callee.object.object.name="fixture"][callee.object.property.name="api"]': (
        fixtureCall: TSESTree.CallExpression,
      ) => {
        try {
          if (!hasAssertions(fixtureCall)) {
            // skip if there are no assertions, let "no-fixture" rule to handle the conversion
            return;
          }

          if (!(isUsedInArrayOrAsArgument(fixtureCall) || getEnclosingFunction(fixtureCall)?.async === false)) {
            return;
          }

          const fixtureFunction = fixtureCall.callee; // e.g. fixture.api.get
          assert.ok(fixtureFunction.type === AST_NODE_TYPES.MemberExpression);
          const indentation = getIndentation(fixtureCall, sourceCode);

          const [urlArgumentNode] = fixtureCall.arguments; // e.g. `/sample-service/v1/ping`
          assert.ok(urlArgumentNode !== undefined);

          const fixtureCallInformation = {} as FixtureCallInformation;
          analyzeFixtureCall(fixtureCall, fixtureCallInformation, sourceCode);

          // convert url from `/sample-service/v1/ping` to `${BASE_PATH}/ping`
          const originalUrlArgumentText = sourceCode.getText(urlArgumentNode);
          const fetchUrlArgumentText = replaceEndpointUrlPrefixWithBasePath(originalUrlArgumentText);

          // fetch request argument
          const methodNode = fixtureFunction.property; // get/put/etc.
          assert.ok(methodNode.type === AST_NODE_TYPES.Identifier);
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
                      `    ${name.type === AST_NODE_TYPES.Literal ? (isValidPropertyName(name.value) ? name.value : `'${name.value}'`) : `[${sourceCode.getText(name)}]`}: ${sourceCode.getText(value)},`,
                  ),
                  `  },`,
                ]
              : []),
            '}',
          ].join(`\n${indentation}`);

          const responseVariableNameToUse = 'res';
          const { statusAssertion, nonStatusAssertions } = createResponseAssertions(
            fixtureCallInformation,
            sourceCode,
            responseVariableNameToUse,
          );

          // add variable declaration if needed
          const disableLintComment = '// eslint-disable-next-line @checkdigit/no-promise-instance-method';
          const fetchCallText = `fetch(${fetchUrlArgumentText}, ${fetchRequestArgumentLines})`;
          const appendingAssignmentAndAssertionText = [
            ...(statusAssertion !== undefined ? [statusAssertion] : []),
            ...nonStatusAssertions,
          ].join(`;\n${indentation}`);
          const replacementText = fixtureCallInformation.assertions
            ? [
                disableLintComment,
                `${fetchCallText}.then((${responseVariableNameToUse}) => {`,
                appendingAssignmentAndAssertionText === '' ? '' : `  ${appendingAssignmentAndAssertionText};`,
                `  return ${responseVariableNameToUse};`,
                `})`,
              ].join(`\n${indentation}`)
            : fetchCallText;

          context.report({
            node: fixtureCall,
            messageId: 'preferNativeFetch',
            fix(fixer) {
              return fixer.replaceText(fixtureCallInformation.fixtureNode, replacementText);
            },
          });

          // const responsesVariable = getEnclosingStatement(fixtureCallInformation.fixtureNode);
          // if (!responsesVariable) {
          //   return;
          // }

          // const responseVariableReferences = scopeManager.getDeclaredVariables(responsesVariable);
          // const responseHeadersAccesses = getResponseHeadersAccesses(
          //   responseVariableReferences,
          //   scopeManager,
          //   sourceCode,
          // );
          // for (const responseHeadersAccess of responseHeadersAccesses) {
          //   if (isInvalidResponseHeadersAccess(responseHeadersAccess)) {
          //     const headerAccess = getParent(responseHeadersAccess);
          //     if (headerAccess?.type === AST_NODE_TYPES.MemberExpression) {
          //       const headerNameNode = headerAccess.property;
          //       const headerName = headerAccess.computed
          //         ? sourceCode.getText(headerNameNode)
          //         : `'${sourceCode.getText(headerNameNode)}'`;
          //       const headerAccessReplacementText = `${sourceCode.getText(headerAccess.object)}.get(${headerName})`;

          //       context.report({
          //         node: headerAccess,
          //         messageId: 'shouldUseHeaderGetter',
          //         fix(fixer) {
          //           return fixer.replaceText(headerAccess, headerAccessReplacementText);
          //         },
          //       });
          //     } else if (
          //       headerAccess?.type === AST_NODE_TYPES.CallExpression &&
          //       responseHeadersAccess.property.type === AST_NODE_TYPES.Identifier &&
          //       responseHeadersAccess.property.name === 'get'
          //     ) {
          //       const headerAccessReplacementText = `${sourceCode.getText(responseHeadersAccess.object)}.headers.get(${sourceCode.getText(headerAccess.arguments[0])})`;

          //       context.report({
          //         node: headerAccess,
          //         messageId: 'shouldUseHeaderGetter',
          //         fix(fixer) {
          //           return fixer.replaceText(headerAccess, headerAccessReplacementText);
          //         },
          //       });
          //     }
          //   }
          // }
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
});

export default rule;
