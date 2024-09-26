// agent/no-unused-imports.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { Scope } from '@typescript-eslint/utils/ts-eslint';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'no-unused-imports';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Remove unused imports.',
    },
    messages: {
      removeUnusedImports: 'Removing unused imports.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function isImportUsed(specifier: TSESTree.ImportClause, scope: Scope.Scope): boolean {
      return (
        specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier ||
        scope.references.some((ref) => ref.identifier.name === specifier.local.name) ||
        scope.childScopes.some((childScope) => isImportUsed(specifier, childScope))
      );
    }

    return {
      ImportDeclaration(importDeclaration) {
        try {
          const moduleName = importDeclaration.source.value;
          if (
            !importDeclaration.specifiers.every(
              (specifier) => specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier,
            ) ||
            // [TODO:] move to meta schema
            !['@checkdigit/serve-runtime', '@checkdigit/fixture'].includes(moduleName)
          ) {
            return;
          }

          const originalSpecifiers = importDeclaration.specifiers;
          const scope = sourceCode.getScope(importDeclaration);
          const usedSpecifiers = originalSpecifiers.filter((specifier) => isImportUsed(specifier, scope));
          if (usedSpecifiers.length === originalSpecifiers.length) {
            return;
          }

          if (usedSpecifiers.length === 0) {
            context.report({
              messageId: 'removeUnusedImports',
              node: importDeclaration,
              *fix(fixer) {
                yield fixer.remove(importDeclaration);
              },
            });
            return;
          }

          const usedSpecifierTexts = usedSpecifiers.map((specifier) => sourceCode.getText(specifier));
          const updatedImportDeclaration = `import ${importDeclaration.importKind === 'type' ? 'type ' : ''}{ ${usedSpecifierTexts.join(', ')} } from '${moduleName}';`;

          context.report({
            messageId: 'removeUnusedImports',
            node: importDeclaration,
            *fix(fixer) {
              yield fixer.replaceText(importDeclaration, updatedImportDeclaration);
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: importDeclaration,
            messageId: 'unknownError',
            data: {
              fileName: context.filename,
              error: error instanceof Error ? error.toString() : JSON.stringify(error),
            },
          });
        }
      },
    };
  },
});

export default rule;
