// agent/no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

import { getParent } from '../library/ts-tree';
import getDocumentationUrl from '../get-documentation-url';
import { getIndentation } from '../library/format';
import { isValidPropertyName } from '../library/variable';
import { replaceEndpointUrlPrefixWithBasePath } from './url';

export const ruleId = 'no-fixture';

interface FixtureCallInformation {
  fixtureNode: TSESTree.CallExpression;
  requestBody?: TSESTree.Expression;
  requestHeaders?: { name: TSESTree.Expression; value: TSESTree.Expression }[];
  requestHeadersObjectLiteral?: TSESTree.ObjectExpression;
  statusAssertion?: TSESTree.CallExpressionArgument[];
  nonStatusAssertions?: TSESTree.CallExpressionArgument[][];
}

function isStatusAssertion(expectArguments: TSESTree.CallExpressionArgument[]) {
  if (expectArguments.length === 1) {
    const [maybeStatusAssertion] = expectArguments;
    assert.ok(maybeStatusAssertion);
    if (
      (maybeStatusAssertion.type === AST_NODE_TYPES.MemberExpression &&
        maybeStatusAssertion.object.type === AST_NODE_TYPES.Identifier &&
        maybeStatusAssertion.object.name === 'StatusCodes') ||
      (maybeStatusAssertion.type === AST_NODE_TYPES.Literal && typeof maybeStatusAssertion.value === 'number')
    ) {
      return true;
    }
  }
  return false;
}

// recursively analyze the fixture/supertest call chain to collect information of request/response
function analyzeFixtureCall(call: TSESTree.CallExpression, results: FixtureCallInformation, sourceCode: SourceCode) {
  sourceCode.getText(call);
  results.fixtureNode = call;

  let nextCall;
  const parent = getParent(call);
  assert.ok(parent, 'parent should exist for fixture/supertest call node');

  if (parent.type === AST_NODE_TYPES.MemberExpression && parent.property.type === AST_NODE_TYPES.Identifier) {
    if (parent.property.name === 'expect') {
      // supertest assertions
      const assertionCall = getParent(parent);
      assert.ok(assertionCall && assertionCall.type === AST_NODE_TYPES.CallExpression);
      if (isStatusAssertion(assertionCall.arguments)) {
        results.statusAssertion = assertionCall.arguments;
      } else {
        results.nonStatusAssertions = [...(results.nonStatusAssertions ?? []), assertionCall.arguments];
      }
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
      const [arg1, arg2] = setRequestHeaderCall.arguments as [TSESTree.Expression, TSESTree.Expression];
      if (arg1.type === AST_NODE_TYPES.ObjectExpression) {
        results.requestHeadersObjectLiteral = arg1;
      } else {
        results.requestHeaders = [...(results.requestHeaders ?? []), { name: arg1, value: arg2 }];
      }
      nextCall = setRequestHeaderCall;
    }
  }
  if (nextCall) {
    analyzeFixtureCall(nextCall, results, sourceCode);
  }
}

function getExpectAssertion(expectArguments: TSESTree.CallExpressionArgument[], sourceCode: SourceCode) {
  return `expect(${expectArguments.map((arg) => sourceCode.getText(arg)).join(', ')})`;
}

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
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    assert.ok(scopeManager !== null);

    return {
      'CallExpression[callee.object.object.name="fixture"][callee.object.property.name="api"]': (
        fixtureCall: TSESTree.CallExpression,
      ) => {
        try {
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
          const methodName = methodNode.name.toUpperCase();
          const methodNameToUse = methodName === 'DEL' ? 'DELETE' : methodName;

          const fetchRequestArgumentLines = [
            '{',
            `  method: '${methodNameToUse}',`,
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
                        `    ${name.type === AST_NODE_TYPES.Literal ? (isValidPropertyName(name.value) ? name.value : `'${name.value}'`) : `[${sourceCode.getText(name)}]`}: ${sourceCode.getText(value)},`,
                    ),
                    `  },`,
                  ]
                : []),
            '}',
          ].join(`\n${indentation}`);

          const fetchCallText = `fetch(${fetchUrlArgumentText}, ${fetchRequestArgumentLines})`;
          const fetchStatementText = [
            fetchCallText,
            ...(fixtureCallInformation.statusAssertion === undefined
              ? []
              : [getExpectAssertion(fixtureCallInformation.statusAssertion, sourceCode)]),
            ...(fixtureCallInformation.nonStatusAssertions === undefined
              ? []
              : fixtureCallInformation.nonStatusAssertions.map((assertion) =>
                  getExpectAssertion(assertion, sourceCode),
                )),
          ].join(`\n${indentation}.`);

          context.report({
            node: fixtureCallInformation.fixtureNode,
            messageId: 'preferNativeFetch',
            fix(fixer) {
              return fixer.replaceText(fixtureCallInformation.fixtureNode, fetchStatementText);
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
});

export default rule;
