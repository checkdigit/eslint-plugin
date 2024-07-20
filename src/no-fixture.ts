// no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/* eslint-disable no-console */

import type { AwaitExpression, Expression, MemberExpression, Node, SimpleCallExpression } from 'estree';
import type { Rule, Scope, SourceCode } from 'eslint';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'no-fixture';

type NodeParent = Node | undefined | null;

interface NodeParentExtension {
  parent: NodeParent;
}

interface FixtureCallInformation {
  root: AwaitExpression;
  requestBody?: Expression;
  requestHeaders?: { name: Expression; value: Expression }[];
  assertions?: Expression[][];
}

function getParent(node: Node): Node | undefined | null {
  return (node as unknown as NodeParentExtension).parent;
}

function analyze(call: SimpleCallExpression, results: FixtureCallInformation) {
  const parent = getParent(call);
  assert.ok(parent, 'parent should exist for fixture/supertest call node');

  let nextCall;
  if (parent.type === 'AwaitExpression') {
    // no more assertions, return the await expression of the fixture call
    results.root = parent;
  } else if (parent.type === 'MemberExpression' && parent.property.type === 'Identifier') {
    if (parent.property.name === 'expect') {
      const assertionCall = getParent(parent);
      assert.ok(assertionCall && assertionCall.type === 'CallExpression');
      results.assertions = [...(results.assertions ?? []), assertionCall.arguments as Expression[]];
      nextCall = assertionCall;
    } else if (parent.property.name === 'send') {
      const sendRequestBodyCall = getParent(parent);
      assert.ok(sendRequestBodyCall && sendRequestBodyCall.type === 'CallExpression');
      results.requestBody = sendRequestBodyCall.arguments[0] as Expression;
      nextCall = sendRequestBodyCall;
    } else if (parent.property.name === 'set') {
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
    analyze(nextCall, results);
  }
}

function replaceEndpointUrlPrefixWithBasePath(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/`\/\w+(?<parts>-\w+)*\/v\d+\//u, '`${BASE_PATH}/');
}

function isValidPropertyName(name: unknown) {
  return typeof name === 'string' && /^[a-zA-Z_$][a-zA-Z_$0-9]*$/u.test(name);
}

function appendAssertions(expects: Expression[][], sourceCode: SourceCode, variableName: string) {
  const assertions: string[] = [];
  for (const expectArguments of expects) {
    if (expectArguments.length === 1) {
      const [assertionArgument] = expectArguments;
      assert.ok(assertionArgument);
      // status
      if (
        assertionArgument.type === 'MemberExpression' &&
        assertionArgument.object.type === 'Identifier' &&
        assertionArgument.object.name === 'StatusCodes'
      ) {
        assertions.push(`assert.equal(${variableName}.status, ${sourceCode.getText(assertionArgument)})`);
      }
    } else if (expectArguments.length === 2) {
      // header assertion
      const [headerName, headerValue] = expectArguments;
      assert.ok(headerName && headerValue);
      if (headerValue.type === 'Literal' && headerValue.value instanceof RegExp) {
        assertions.push(
          `assert.ok(${variableName}.headers.get(${sourceCode.getText(headerName)}).match(${sourceCode.getText(headerValue)}))`,
        );
      } else {
        assertions.push(
          `assert.equal(${variableName}.headers.get(${sourceCode.getText(headerName)}), ${sourceCode.getText(headerValue)})`,
        );
      }
    }
  }
  return assertions;
}

function getAncestor(node: Node, matchType: string, quitType: string) {
  const parent = getParent(node);
  if (!parent || parent.type === quitType) {
    return undefined;
  } else if (parent.type === matchType) {
    return parent;
  }
  return getAncestor(parent, matchType, quitType);
}

function analyzeReferences(fixtureCallAwait: AwaitExpression, scopeManager: Scope.ScopeManager) {
  const results: {
    responseVariableName?: string;
    responseBodyReferences: MemberExpression[];
    responseHeadersReferences: MemberExpression[];
  } = {
    responseBodyReferences: [],
    responseHeadersReferences: [],
  };

  const variableDeclaration = getAncestor(fixtureCallAwait, 'VariableDeclaration', 'FunctionDeclaration');
  if (variableDeclaration && variableDeclaration.type === 'VariableDeclaration') {
    const [responseVariable] = scopeManager.getDeclaredVariables(variableDeclaration);
    assert.ok(responseVariable);

    results.responseVariableName = responseVariable.name;
    results.responseBodyReferences = responseVariable.references
      .map((responseBodyReference) => getParent(responseBodyReference.identifier))
      .filter(
        (node): node is MemberExpression =>
          node !== null &&
          node !== undefined &&
          node.type === 'MemberExpression' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'body',
      );
    results.responseHeadersReferences = responseVariable.references
      .map((responseHeadersReference) => getParent(responseHeadersReference.identifier))
      .filter(
        (node): node is MemberExpression =>
          node !== null &&
          node !== undefined &&
          node.type === 'MemberExpression' &&
          node.property.type === 'Identifier' &&
          (node.property.name === 'header' || node.property.name === 'headers'),
      );
  }
  return results;
}

function getIndentation(node: Node, sourceCode: SourceCode) {
  assert.ok(node.loc);
  const line = sourceCode.lines[node.loc.start.line - 1];
  assert.ok(line);
  const indentMatch = line.match(/^\s*/u);
  return indentMatch ? indentMatch[0] : '';
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
    let variableCounter = 0;

    return {
      'CallExpression[callee.object.object.name="fixture"][callee.object.property.name="api"]': (fixtureCall: Node) => {
        try {
          assert.ok(fixtureCall.type === 'CallExpression');
          const fixtureFunction = fixtureCall.callee; // node - fixture.api.get
          assert.ok(fixtureFunction.type === 'MemberExpression');
          const methodNode = fixtureFunction.property; // get/put/etc.
          assert.ok(methodNode.type === 'Identifier');
          const indentation = getIndentation(fixtureCall, sourceCode);

          const [urlArgumentNode] = fixtureCall.arguments; // node - `/smartdata/v1/ping`
          assert.ok(urlArgumentNode !== undefined);

          const fixtureCallInformation = {} as FixtureCallInformation;
          analyze(fixtureCall, fixtureCallInformation);

          const { responseVariableName, responseBodyReferences, responseHeadersReferences } = analyzeReferences(
            fixtureCallInformation.root,
            scopeManager,
          );
          let variableNameToUse: string;
          let isResponseVariableDeclared = false;
          if (responseVariableName === undefined) {
            variableNameToUse = `response${variableCounter === 0 ? '' : variableCounter.toString()}`;
            variableCounter++;
          } else {
            isResponseVariableDeclared = true;
            variableNameToUse = responseVariableName;
          }

          // convert fixture.api.get to fetch
          const fixtureApiCallText = sourceCode.getText(fixtureCall); // e.g. "fixture.api.get(`/smartdata/v1/ping`)""
          const fixtureMethodText = sourceCode.getText(fixtureFunction); // e.g. "fixture.api.get"
          let replacedText = fixtureApiCallText.replace(fixtureMethodText, 'await fetch');

          // convert `/smartdata/v1/ping` to `${BASE_PATH}/ping`
          const fixtureArgumentText = sourceCode.getText(urlArgumentNode); // text - e.g. `/smartdata/v1/ping`
          let fetchArgumentText = replaceEndpointUrlPrefixWithBasePath(fixtureArgumentText); // test - e.g. `${BASE_PATH}/ping`

          // add request argument if deeded
          if (
            methodNode.name !== 'get' ||
            fixtureCallInformation.requestBody !== undefined ||
            fixtureCallInformation.requestHeaders !== undefined
          ) {
            fetchArgumentText += [
              ', {',
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
          }

          replacedText = replacedText.replace(fixtureArgumentText, fetchArgumentText);

          if (fixtureCallInformation.assertions) {
            // add variable declaration if needed
            if (!isResponseVariableDeclared) {
              replacedText = `const ${variableNameToUse} = ${replacedText}`;
            }
            // externalize response assertions
            replacedText = [
              replacedText,
              ...appendAssertions(fixtureCallInformation.assertions, sourceCode, variableNameToUse),
            ].join(`;\n${indentation}`);
          }

          context.report({
            node: fixtureCall,
            messageId: 'preferNativeFetch',
            *fix(fixer) {
              yield fixer.replaceText(fixtureCallInformation.root, replacedText);

              for (const responseBodyReference of responseBodyReferences) {
                yield fixer.replaceText(responseBodyReference, `await ${variableNameToUse}.json()`);
              }
              for (const responseHeadersReference of responseHeadersReferences) {
                const parent = getParent(responseHeadersReference);
                assert.ok(parent?.type === 'MemberExpression');
                const headerNameNode = parent.property;
                const headerName =
                  // eslint-disable-next-line no-nested-ternary, @typescript-eslint/restrict-template-expressions
                  parent.computed ? sourceCode.getText(headerNameNode) : `'${sourceCode.getText(headerNameNode)}'`;
                assert.ok(headerName);
                yield fixer.replaceText(parent, `${variableNameToUse}.headers.get(${headerName})`);
              }
            },
          });
        } catch (error) {
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
