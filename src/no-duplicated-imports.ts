// no-duplicated-imports.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-duplicated-imports';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'mergeDuplicatedImports'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Merge duplicated import statements with the same "from".',
    },
    messages: {
      mergeDuplicatedImports: 'Merge duplicated import statements with the same "from".',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const importDeclarations = new Map<string, TSESTree.ImportDeclaration[]>();

    return {
      ImportDeclaration(node) {
        const moduleName = node.source.value;
        let declarations = importDeclarations.get(moduleName);
        if (declarations === undefined) {
          declarations = [];
          importDeclarations.set(moduleName, declarations);
        }
        declarations.push(node);
      },
      'Program:exit'() {
        for (const [moduleName, allDeclarations] of importDeclarations.entries()) {
          const declarations = allDeclarations.filter(
            (declaration) =>
              !declaration.specifiers.some(
                (specifier) => specifier.type === TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier,
              ),
          );
          if (declarations.length <= 1) {
            continue;
          }

          const firstDeclaration = declarations[0];
          assert.ok(firstDeclaration);

          const isAllTypeOnly = declarations.every(
            (declaration) =>
              declaration.importKind === 'type' ||
              declaration.specifiers.every(
                (specifier) =>
                  specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && specifier.importKind === 'type',
              ),
          );

          context.report({
            messageId: 'mergeDuplicatedImports',
            node: firstDeclaration,
            fix(fixer) {
              const fixes = [];

              const defaultSpecifier = declarations
                .flatMap((declaration) =>
                  declaration.specifiers.map((specifier) =>
                    specifier.type === TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier ? specifier : undefined,
                  ),
                )
                .filter(Boolean);
              const defaultSpecifierText = defaultSpecifier[0] ? sourceCode.getText(defaultSpecifier[0]) : undefined;

              const mergedSpecifiers = declarations.flatMap((declaration) => {
                const isCurrentDeclarationTypeOnly =
                  declaration.importKind === 'type' ||
                  declaration.specifiers.every(
                    (specifier) =>
                      specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && specifier.importKind === 'type',
                  );
                return declaration.specifiers
                  .filter((specifier) => specifier.type !== TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier)
                  .map((specifier) =>
                    // eslint-disable-next-line no-nested-ternary
                    isAllTypeOnly
                      ? sourceCode.getText(specifier).replace('type ', '')
                      : isCurrentDeclarationTypeOnly
                        ? `type ${sourceCode.getText(specifier)}`
                        : sourceCode.getText(specifier),
                  );
              });
              const mergedSpecifiersText = `${isAllTypeOnly ? 'type ' : ''}{ ${mergedSpecifiers.join(', ')} }`;

              // Replace the first import with the merged import
              const mergedImport = `import ${[defaultSpecifierText, mergedSpecifiersText].filter(Boolean).join(', ')} from '${moduleName}';`;
              fixes.push(fixer.replaceText(firstDeclaration, mergedImport));

              // Remove the remaining imports
              declarations.slice(1).forEach((declaration) => {
                fixes.push(fixer.removeRange([declaration.range[0], declaration.range[1] + 1]));
              });

              return fixes;
            },
          });
        }
      },
    };
  },
});

export default rule;
