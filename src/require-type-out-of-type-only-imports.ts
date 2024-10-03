// require-type-out-of-type-only-imports.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'require-type-out-of-type-only-imports';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require "type" to be out side of type-only imports.',
    },
    messages: {
      moveTypeOutside: 'Update the type-only imports to use "tpe" outside of the curly braces.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ImportDeclaration(declaration) {
        if (
          declaration.importKind === 'type' ||
          !declaration.specifiers.every(
            (specifier) =>
              specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && specifier.importKind === 'type',
          )
        ) {
          return;
        }

        context.report({
          messageId: 'moveTypeOutside',
          node: declaration,
          *fix(fixer) {
            const moduleName = declaration.source.value;
            const mergedSpecifiers = declaration.specifiers
              .filter((specifier) => specifier.type !== TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier)
              .map((specifier) => sourceCode.getText(specifier).replace('type ', ''));
            const updatedImportDeclaration = `import type { ${mergedSpecifiers.join(', ')} } from '${moduleName}';`;

            yield fixer.replaceText(declaration, updatedImportDeclaration);
          },
        });
      },
    };
  },
});

export default rule;
