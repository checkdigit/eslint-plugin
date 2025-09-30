// require-aws-config.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-aws-config';
export const MESSAGE_ID_REQUIRE_AWS_CONFIG = 'requireAwsConfig';
const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<typeof MESSAGE_ID_REQUIRE_AWS_CONFIG> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Require to apply @checkdigit/aws-config along with qualifier instead of using aws client directly.',
    },
    messages: {
      [MESSAGE_ID_REQUIRE_AWS_CONFIG]:
        'Please apply @checkdigit/aws-config along with qualifier instead of using aws client {{awsClientName}} directly.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { isAwsSdkV3Used } = context.settings;
    if (isAwsSdkV3Used !== true) {
      return {};
    }

    return {
      NewExpression(node) {
        if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name.endsWith('Client')) {
          context.report({
            node,
            messageId: 'requireAwsConfig',
            data: { awsClientName: node.callee.name },
          });
        } else if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          // Handle `new AWS.DynamoDBClient()` style (MemberExpression)
          const property = node.callee.property;
          if (property.type === AST_NODE_TYPES.Identifier && property.name.endsWith('Client')) {
            context.report({
              node,
              messageId: 'requireAwsConfig',
              data: { awsClientName: property.name },
            });
          }
        }
      },
    };
  },
});

export default rule;
