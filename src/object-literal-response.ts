// object-literal-response.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { CallExpression, Property } from 'estree';
import type { Rule } from 'eslint';

export const REQUIRE_OBJECT_LITERAL_MESSAGE_ID = 'REQUIRE_OBJECT_LITERAL_MESSAGE_ID';
export const REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID =
  'REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID';
export const REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID = 'REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID';

// eslint-disable-next-line no-magic-numbers
const GOOD_STATUS_VALUES = [200, 201, 202, 203, 204, 205, 206, 207];

// enum names corresponding to 2xx status codes defined in GOOD_STATUS_VALUES above
const GOOD_STATUS_ENUM_NAMES = [
  'OK',
  'CREATED',
  'ACCEPTED',
  'NON_AUTHORITATIVE_INFORMATION',
  'NO_CONTENT',
  'RESET_CONTENT',
  'PARTIAL_CONTENT',
  'MULTI_STATUS',
];

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects if object literal is used for body property when calling setResponse function for error response',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [REQUIRE_OBJECT_LITERAL_MESSAGE_ID]: `Object literal should be used when calling setResponse function`,
      [REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID]: `Object literal should be used for body property when calling setResponse function for error response`,
      [REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID]: `Object literal should be used for response headers`,
    },
  },
  create(context) {
    return {
      // eslint-disable-next-line sonarjs/cognitive-complexity
      CallExpression(node: CallExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'setResponse') {
          const responseContext = node.arguments[1];

          // check top level object literal
          if (responseContext && responseContext.type !== 'ObjectExpression') {
            context.report({
              node: responseContext,
              messageId: REQUIRE_OBJECT_LITERAL_MESSAGE_ID,
            });
          }

          // check response headers
          if (responseContext && responseContext.type === 'ObjectExpression') {
            const headers = responseContext.properties.find(
              (property) =>
                property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'headers',
            ) as Property | undefined;
            if (headers !== undefined && headers.value.type !== 'ObjectExpression') {
              context.report({
                node: headers,
                messageId: REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID,
              });
            }
          }

          // check response body
          if (responseContext && responseContext.type === 'ObjectExpression') {
            const status = responseContext.properties.find(
              (property) =>
                property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'status',
            ) as Property;
            let isSuccessfulResponse;
            if (status.value.type === 'MemberExpression') {
              isSuccessfulResponse =
                status.value.object.type === 'Identifier' &&
                status.value.object.name === 'StatusCodes' &&
                status.value.property.type === 'Identifier' &&
                GOOD_STATUS_ENUM_NAMES.includes(status.value.property.name);
            } else if (status.value.type === 'Literal') {
              isSuccessfulResponse =
                typeof status.value.value === 'number' && GOOD_STATUS_VALUES.includes(status.value.value);
            }
            if (isSuccessfulResponse === false) {
              // handle error response
              const body = responseContext.properties.find(
                (property) =>
                  property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'body',
              ) as Property | undefined;
              if (body === undefined) {
                return; // no body to lint for
              }

              if (body.value.type !== 'ObjectExpression') {
                context.report({
                  node: body,
                  messageId: REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID,
                });
              }
            }
          }
        }
      },
    };
  },
} as Rule.RuleModule;
