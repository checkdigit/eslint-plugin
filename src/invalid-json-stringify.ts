// invalid-json-stringify.ts

import type { Rule } from 'eslint';
import getDocumentationUrl from './get-documentation-url';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export const ruleId = 'invalid-json-stringify';
const INVALID_JSON_STRINGIFY = 'INVALID_JSON_STRINGIFY';
const DEFAULT_OPTIONS = ['error|.*Error'];

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Serializing objects with JSON.stringify() can lose information for certain data payload (e.g. Error). This rule disallows serializing such objects by matching the name of the first parameter passed to JSON.stringify() using Regexp pattern.',
      url: getDocumentationUrl(ruleId),
    },
    schema: [
      {
        type: 'array',
        items: {
          description: 'Regular expression pattern to match the name of the first parameter of JSON.stringify().',
          type: 'string',
          minItems: 1,
        },
      },
    ],
    messages: {
      [INVALID_JSON_STRINGIFY]: `Serializing paremeter "{{ parameterName }}" with JSON.stringify can potentially lose information.`,
    },
    fixable: 'code',
  },
  create(context) {
    const options = (context.options[0] ?? DEFAULT_OPTIONS) as string[];
    const invalidParameterNamePatterns = options.map((option) => new RegExp(option, 'u'));

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'JSON' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'stringify'
        ) {
          const argument = node.arguments[0];
          if (argument !== undefined && argument.type === 'Identifier') {
            invalidParameterNamePatterns.some((invalidParameterNamePattern) => {
              if (invalidParameterNamePattern.test(argument.name)) {
                context.report({
                  node,
                  messageId: INVALID_JSON_STRINGIFY,
                  data: {
                    parameterName: argument.name,
                  },
                  fix(fixer) {
                    return fixer.replaceText(node, `String(${argument.name})`);
                  },
                });
                return true;
              }
              return false;
            });
          }
        }
      },
    };
  },
} as Rule.RuleModule;
