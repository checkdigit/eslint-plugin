// pure-functions.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type * as ESTree from 'estree';
import type { Rule } from 'eslint';

const INVALID_CLOSURE = 'INVALID_CLOSURE';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow closures of anything other than const primitive values',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [INVALID_CLOSURE]: 'invalid closure over {{ name }}',
    },
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
    const manager = sourceCode.scopeManager;

    function check(node: ESTree.Node): void {
      const functionScope = manager.acquire(node);
      const functionRange = node.range;
      if (functionRange === undefined) {
        return;
      }

      const queue = [functionScope];
      let scope;
      while ((scope = queue.pop())) {
        queue.push(...scope.childScopes);
        for (const reference of scope.references) {
          const variable = reference.resolved;
          if (
            variable !== null &&
            variable.defs.every((definition) => {
              const definitionNode = definition.node as { range: [number, number]; init?: { type: string } };
              const definitionRange = definitionNode.range;
              return (
                (functionRange[0] > definitionRange[0] || definitionRange[1] < functionRange[0]) &&
                !(
                  (definition as unknown as { kind: string }).kind === 'const' &&
                  definitionNode.init?.type === 'Literal'
                )
              );
            })
          ) {
            context.report({
              node: reference.identifier,
              messageId: INVALID_CLOSURE,
              data: { name: variable.name },
            });
          }
        }
      }
    }

    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
    };
  },
} as Rule.RuleModule;
