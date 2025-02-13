// no-promise-instance-method.ts

import type { Rule } from 'eslint';
import getDocumentationUrl from './get-documentation-url.ts';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export const ruleId = 'no-promise-instance-method';
export const NO_PROMISE_INSTANCE_METHOD_THEN = 'NO_PROMISE_INSTANCE_METHOD_THEN';
export const NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY = 'NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY';

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'To be consistent of handling Promises, this rule suggest replacing the usage of methods like "then"/"catch"/"finally" of a Promise instance with "await" or regular try/catch/finally block.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      [NO_PROMISE_INSTANCE_METHOD_THEN]: `To be consistent, please replace "then" method of a Promise instance with "await"`,
      [NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY]: `To be consistent, please replace "catch"/"finally" methods of a Promise instance with regular try/catch/finally block`,
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type === 'Identifier' && ['then', 'catch', 'finally'].includes(node.property.name)) {
          context.report({
            node,
            messageId:
              node.property.name === 'then'
                ? NO_PROMISE_INSTANCE_METHOD_THEN
                : NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY,
          });
        }
      },
    };
  },
} as Rule.RuleModule;
