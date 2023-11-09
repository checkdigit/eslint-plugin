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
        if (
          (node.value === 'node:assert' || node.value === 'node:assert/strict') &&
          node.parent.type === 'ImportDeclaration'
        ) {
          const importDeclaration = node.parent;
          const defaultSpecifier = importDeclaration.specifiers.find(
            (specifier) => specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier',
          );

          if (defaultSpecifier) {
            const importDeclarationRange = importDeclaration.range ?? [0, 0];
            let rangeToReplace = defaultSpecifier.range ?? importDeclarationRange;
            let correctedText = `{ strict as ${defaultSpecifier.local.name} }`;

            if (node.value === 'node:assert/strict' && defaultSpecifier.range && importDeclaration.source.range) {
              rangeToReplace = [defaultSpecifier.range[0], importDeclaration.source.range[1]];
              correctedText = `{ strict as ${defaultSpecifier.local.name} } from 'node:assert'`;
            }

            context.report({
              node: importDeclaration,
              message: 'Require strict assertion mode.',
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
          'name' in callee.property &&
          (callee.property.name.includes('strict') || callee.property.name.includes('Strict'))
        ) {
          let nonStrictFunctionName = '';
          const strictFunctionName = callee.property.name;
          if (strictFunctionName === 'strict') {
            nonStrictFunctionName = `${callee.object.name}.equal`;
          } else {
            const functionName = strictFunctionName.includes('strict')
              ? strictFunctionName.split('strict').join('')
              : strictFunctionName.split('Strict').join('');
            const fixedFunctionName = `${functionName.charAt(0).toLowerCase()}${functionName.slice(1)}`;
            nonStrictFunctionName = `${callee.object.name}.${fixedFunctionName}`;
          }
          context.report({
            node,
            message: 'strict method not required when in strict assertion mode.',
            fix: (fixer) => fixer.replaceText(callee, nonStrictFunctionName),
          });
        }
      },
    };
  },
} as Rule.RuleModule;
