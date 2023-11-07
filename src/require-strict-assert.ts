// require-strict-assert.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require importing strict version of node:assert and using non-strict assert functions.',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context) {
    return {
      Literal(node) {
        if (node.value === 'node:assert' && node.parent.type === 'ImportDeclaration') {
          const importDeclaration = node.parent;
          const defaultSpecifier = importDeclaration.specifiers.find(
            (specifier) => specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier',
          );

          if (defaultSpecifier) {
            const importDeclarationRange = importDeclaration.range ?? [0, 0];
            const rangeToReplace = defaultSpecifier.range ?? importDeclarationRange;
            const correctedText = '{ strict as assert }';

            context.report({
              node: importDeclaration,
              message: 'Require the strict version of node:assert.',
              fix: (fixer) => fixer.replaceTextRange(rangeToReplace, correctedText),
            });
          }
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          'name' in callee.object &&
          callee.object.name === 'assert' &&
          'name' in callee.property &&
          (callee.property.name.includes('strict') || callee.property.name.includes('Strict'))
        ) {
          const strictFunctionName = callee.property.name;
          const functionName = strictFunctionName.includes('strict')
            ? strictFunctionName.split('strict').join('')
            : strictFunctionName.split('Strict').join('');
          const fixedFunctionName = `${functionName.charAt(0).toLowerCase()}${functionName.slice(1)}`;
          const nonStrictFunctionName = `assert.${fixedFunctionName}`;
          context.report({
            node,
            message: 'Use non-strict counterpart for assert function.',
            fix(fixer) {
              return fixer.replaceText(callee, nonStrictFunctionName);
            },
          });
        }
      },
    };
  },
} as Rule.RuleModule;
