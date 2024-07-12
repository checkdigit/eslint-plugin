// no-promise-instance-method.ts

import type { Node } from 'estree';
import type { Rule } from 'eslint';
import getDocumentationUrl from './get-documentation-url';

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export const ruleId = 'no-promise-instance-method';
export const NO_PROMISE_INSTANCE_METHOD_THEN = 'NO_PROMISE_INSTANCE_METHOD_THEN';
export const NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY = 'NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY';

function isPromise(context: Rule.RuleContext, node: Node): boolean {
  // new Promise(...)
  if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Promise') {
    return true;
  }
  // Promise.resolve(...), Promise.all(...), etc.
  if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'Promise') {
    return true;
  }

  if (node.type === 'CallExpression') {
    return isPromise(context, node.callee);
  }

  if (node.type === 'Identifier') {
    const variableDeclaration = context.getScope().variables.find((variable) => variable.name === node.name);
    if (variableDeclaration) {
      return variableDeclaration.defs.some((variableDefinition) => {
        if (variableDefinition.type === 'Variable') {
          const variableInitialization = variableDefinition.node.init;
          if (!variableInitialization) {
            return false;
          }
          return (
            (variableInitialization.type === 'NewExpression' &&
              variableInitialization.callee.type === 'Identifier' &&
              variableInitialization.callee.name === 'Promise') ||
            (variableInitialization.type === 'CallExpression' && isPromise(context, variableInitialization.callee)) ||
            (variableInitialization.type === 'AwaitExpression' && isPromise(context, variableInitialization.argument))
          );
        }

        if (variableDefinition.type === 'FunctionName' && variableDefinition.node.type === 'FunctionDeclaration') {
          return variableDefinition.node.async;
        }

        return false;
      });
    }
  }

  return false;
}

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
        if (
          node.property.type === 'Identifier' &&
          ['then', 'catch', 'finally'].includes(node.property.name) &&
          isPromise(context, node.object)
        ) {
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
