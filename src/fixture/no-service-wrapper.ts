// fixture/no-service-wrapper.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { type Scope } from '@typescript-eslint/scope-manager';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from '../get-documentation-url';
import { getEnclosingScopeNode } from '../ast/ts-tree';
import { getIndentation } from '../ast/format';

export const ruleId = 'no-service-wrapper';

// interface ServiceCallInformation {
//   rootNode:
//     | TSESTree.AwaitExpression
//     | TSESTree.ReturnStatement
//     | TSESTree.VariableDeclaration
//     | TSESTree.CallExpression;
//   fixtureNode: TSESTree.AwaitExpression | TSESTree.CallExpression;
//   variableDeclaration?: TSESTree.VariableDeclaration;
//   requestBody?: TSESTree.Expression;
//   requestHeaders?: TSESTree.Expression;
// }

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch over customized service wrapper.',
    },
    messages: {
      preferNativeFetch: 'Prefer native fetch over customized service wrapper.',
      invalidOptions:
        '"options" argument should be provided with "resolveWithFullResponse" property set as "true". Otherwise, it indicates that the response body will be obtained without status code assertion which could result in unexpected issue. Please manually convert the usage of customized service wrapper call to native fetch.',
      // unknownError:
      //   'Unknown error occurred in file "{{fileName}}": {{ error }}. Please manually convert the usage of customized service wrapper call to native fetch.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  // eslint-disable-next-line max-lines-per-function
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    const parserService = ESLintUtils.getParserServices(context);
    const typeChecker = parserService.program.getTypeChecker();

    // function reportUnknownError(node: TSESTree.Node, error: string) {
    //   context.report({
    //     node,
    //     messageId: 'unknownError',
    //     data: { error, fileName: context.filename },
    //   });
    // }

    function isUrlArgumentTemplateLiteral(urlArgument: TSESTree.Node | undefined, scope: Scope) {
      return (
        urlArgument?.type === AST_NODE_TYPES.TemplateLiteral ||
        (urlArgument?.type === AST_NODE_TYPES.Identifier &&
          scope.variables.some((variable) => variable.name === urlArgument.name))
      );
    }

    function getType(identifier: TSESTree.Identifier) {
      const variable = parserService.esTreeNodeToTSNodeMap.get(identifier);
      const variableType = typeChecker.getTypeAtLocation(variable);
      return typeChecker.typeToString(variableType);
    }

    function isServiceLikeName(name: string) {
      return /.*[Ss]ervice$/u.test(name);
    }

    function isCalleeServiceWrapper(serviceCall: TSESTree.CallExpression) {
      const callee = serviceCall.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
      }

      const endpoint = callee.object;
      if (endpoint.type === AST_NODE_TYPES.Identifier) {
        return getType(endpoint) === 'Endpoint' || isServiceLikeName(endpoint.name);
      }
      if (endpoint.type !== AST_NODE_TYPES.CallExpression) {
        return false;
      }

      const [contextArgument] = endpoint.arguments;
      if (contextArgument?.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      if (contextArgument.name !== 'EMPTY_CONTEXT' && getType(contextArgument) !== 'InboundContext') {
        return false;
      }
      const service = endpoint.callee;
      if (service.type === AST_NODE_TYPES.Identifier) {
        return getType(service) === 'ResolvedService';
      }

      if (service.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
      }
      const services = service.object;
      if (services.type === AST_NODE_TYPES.Identifier) {
        return getType(services) === 'ResolvedServices';
      }

      if (services.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
      }
      const configuration = services.object;
      if (configuration.type === AST_NODE_TYPES.Identifier) {
        return getType(configuration) === 'Configuration';
      }

      // following applies only to test code (fixture)
      if (configuration.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
      }
      const fixture = configuration.object;
      if (fixture.type === AST_NODE_TYPES.Identifier) {
        return fixture.name === 'fixture' || getType(fixture) === 'Fixture';
      }

      return false;
    }

    return {
      'CallExpression[callee.property.name=/^(head|get|put|post|del|patch)$/]': (
        serviceCall: TSESTree.CallExpression,
      ) => {
        const enclosingScopeNode = getEnclosingScopeNode(serviceCall);
        assert.ok(enclosingScopeNode, 'enclosingScopeNode is undefined');
        const scope = scopeManager?.acquire(enclosingScopeNode);
        assert.ok(scope, 'scope is undefined');

        const urlArgument = serviceCall.arguments[0];

        if (!isUrlArgumentTemplateLiteral(urlArgument, scope)) {
          return;
        }

        if (!isCalleeServiceWrapper(serviceCall)) {
          return;
        }

        assert.ok(serviceCall.callee.type === AST_NODE_TYPES.MemberExpression);
        assert.ok(serviceCall.callee.property.type === AST_NODE_TYPES.Identifier);

        // method
        const method = serviceCall.callee.property.name;

        // body
        const requestBodyProperty = ['put', 'post', 'options'].includes(method) ? serviceCall.arguments[1] : undefined;

        // options
        const optionsArgument = ['get', 'head', 'del'].includes(method)
          ? serviceCall.arguments[1]
          : serviceCall.arguments[2];
        if (optionsArgument === undefined || optionsArgument.type !== AST_NODE_TYPES.ObjectExpression) {
          context.report({
            node: serviceCall,
            messageId: 'invalidOptions',
          });
          return;
        }
        const resolveWithFullResponseProperty = optionsArgument.properties.find(
          (property) =>
            property.type === AST_NODE_TYPES.Property &&
            property.key.type === AST_NODE_TYPES.Identifier &&
            property.key.name === 'resolveWithFullResponse',
        );
        if (
          resolveWithFullResponseProperty?.type !== AST_NODE_TYPES.Property ||
          resolveWithFullResponseProperty.value.type !== AST_NODE_TYPES.Literal ||
          resolveWithFullResponseProperty.value.value !== true
        ) {
          context.report({
            node: optionsArgument,
            messageId: 'invalidOptions',
          });
          return;
        }

        // headers
        const requestHeadersProperty = optionsArgument.properties.find(
          (property) =>
            property.type === AST_NODE_TYPES.Property &&
            property.key.type === AST_NODE_TYPES.Identifier &&
            property.key.name === 'headers',
        );

        context.report({
          messageId: 'preferNativeFetch',
          node: serviceCall,
          fix(fixer) {
            const url = sourceCode.getText(urlArgument);
            const indentation = getIndentation(serviceCall, sourceCode);
            const fetchText = [
              `fetch(${url}, {`,
              `  method: '${method.toUpperCase()}',`,
              ...(requestHeadersProperty ? [`  ${sourceCode.getText(requestHeadersProperty)},`] : []),
              ...(requestBodyProperty ? [`  body: JSON.stringify(${sourceCode.getText(requestBodyProperty)}),`] : []),
              '})',
            ].join(`\n${indentation}`);
            return fixer.replaceText(serviceCall, fetchText);
          },
        });
      },
    };
  },
});

export default rule;
