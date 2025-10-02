// require-aws-config.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-aws-config';
export const MESSAGE_ID_REQUIRE_AWS_CONFIG = 'requireAwsConfig';
export const MESSAGE_ID_NO_CHECKDIGIT_AWS = 'noCheckdigitAws';
const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

function isAwsSdkClientModule(importDeclaration: TSESTree.ImportDeclaration): boolean {
  return importDeclaration.source.value.startsWith('@aws-sdk/client-');
}

function isCheckdigitAwsModule(importDeclaration: TSESTree.ImportDeclaration): boolean {
  return importDeclaration.source.value === '@checkdigit/aws';
}

function isAwsClient(awsClientName: string, importedAwsClients?: Set<string>): boolean {
  // for simplicity, just check if it ends with 'Client'
  // we can consider type checking in the future if needed to verify if it actually extends from AWS SDK's Smithy Client class
  return (
    awsClientName.endsWith('Client') && (importedAwsClients === undefined || importedAwsClients.has(awsClientName))
  );
}

const importedAwsClients = new Set<string>();

const rule: ESLintUtils.RuleModule<typeof MESSAGE_ID_REQUIRE_AWS_CONFIG | typeof MESSAGE_ID_NO_CHECKDIGIT_AWS> =
  createRule({
    name: ruleId,
    meta: {
      type: 'problem',
      docs: {
        description:
          'Require applying @checkdigit/aws-config with qualifier/environment instead of creating new AWS client instance directly. Also disallow importing from deprecated @checkdigit/aws module.',
      },
      messages: {
        [MESSAGE_ID_REQUIRE_AWS_CONFIG]:
          'Please apply @checkdigit/aws-config with qualifier/environment instead of creating new instance of {{awsClientName}} directly.',
        [MESSAGE_ID_NO_CHECKDIGIT_AWS]:
          'No longer import from deprecated module "@checkdigit/aws". Please migrate to the official AWS SDK v3 modules.',
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      const { isAwsSdkV3Used } = context.settings;

      return {
        ImportDeclaration(node) {
          if (isAwsSdkV3Used !== true) {
            return;
          }

          if (isCheckdigitAwsModule(node)) {
            context.report({
              node,
              messageId: MESSAGE_ID_NO_CHECKDIGIT_AWS,
            });
            return;
          }

          if (isAwsSdkClientModule(node)) {
            for (const specifier of node.specifiers) {
              if (specifier.type === AST_NODE_TYPES.ImportSpecifier && isAwsClient(specifier.local.name)) {
                importedAwsClients.add(specifier.local.name);
              }
            }
          }
        },

        NewExpression(node) {
          if (isAwsSdkV3Used !== true) {
            return;
          }

          if (node.callee.type === AST_NODE_TYPES.Identifier && isAwsClient(node.callee.name, importedAwsClients)) {
            context.report({
              node,
              messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
              data: { awsClientName: node.callee.name },
            });
          } else if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
            // Handle `new AWS.DynamoDBClient()` style (MemberExpression)
            const property = node.callee.property;
            if (property.type === AST_NODE_TYPES.Identifier && isAwsClient(property.name, importedAwsClients)) {
              context.report({
                node,
                messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
                data: { awsClientName: property.name },
              });
            }
          }
        },
      };
    },
  });

export default rule;
