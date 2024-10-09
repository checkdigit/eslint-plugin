// require-resolve-full-response.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { DefinitionType, type Scope } from '@typescript-eslint/scope-manager';
import getDocumentationUrl from './get-documentation-url';
import { getEnclosingScopeNode } from './library/ts-tree';

export const ruleId = 'require-resolve-full-response';
export const PLAIN_URL_REGEXP = /^[`']\/\w+(?<serviceNamePart>-\w+)*\/v\d+\/(?<any>.|\r|\n)+[`']$/u;
export const TOKENIZED_URL_REGEXP = /^`\$\{(?<serviceNamePart>[A-Z]+_)*BASE_PATH\}\/(?<any>.|\r|\n)+`$/u;

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch over customized service wrapper.',
    },
    messages: {
      invalidOptions:
        '"options" argument should be provided with "resolveWithFullResponse" property set as "true". Otherwise, it indicates that the response body will be obtained without status code assertion which could result in unexpected issue.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;
    const parserService = ESLintUtils.getParserServices(context);
    const typeChecker = parserService.program.getTypeChecker();

    function isUrlArgumentValid(urlArgument: TSESTree.Node | undefined, scope: Scope) {
      if (
        (urlArgument?.type === AST_NODE_TYPES.Literal && typeof urlArgument.value === 'string') ||
        urlArgument?.type === AST_NODE_TYPES.TemplateLiteral
      ) {
        const urlText = sourceCode.getText(urlArgument);
        return PLAIN_URL_REGEXP.test(urlText) || TOKENIZED_URL_REGEXP.test(urlText);
      }

      if (urlArgument?.type === AST_NODE_TYPES.Identifier) {
        const foundVariable = scope.variables.find((variable) => variable.name === urlArgument.name);
        if (foundVariable) {
          const variableDefinition = foundVariable.defs.find((def) => def.type === DefinitionType.Variable);
          assert.ok(variableDefinition, `Variable "${urlArgument.name}" not defined in scope`);
          const variableDefinitionNode = variableDefinition.node;
          assert.ok(variableDefinitionNode.init, 'Variable definition node has no init property');
          return isUrlArgumentValid(variableDefinitionNode.init, scope);
        }
      }

      return false;
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
        return ['Configuration', 'Configuration<ResolvedServices>'].includes(getType(configuration));
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
        try {
          if (!isCalleeServiceWrapper(serviceCall)) {
            return;
          }

          const enclosingScopeNode = getEnclosingScopeNode(serviceCall);
          assert.ok(enclosingScopeNode, 'enclosingScopeNode is undefined');
          const scope = scopeManager?.acquire(enclosingScopeNode);
          assert.ok(scope, 'scope is undefined');
          const urlArgument = serviceCall.arguments[0];
          if (!isUrlArgumentValid(urlArgument, scope)) {
            return;
          }

          assert.ok(serviceCall.callee.type === AST_NODE_TYPES.MemberExpression);
          assert.ok(serviceCall.callee.property.type === AST_NODE_TYPES.Identifier);

          // method
          const method = serviceCall.callee.property.name;

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
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: serviceCall,
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
