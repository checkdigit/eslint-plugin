// no-duplicated-imports.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-duplicated-imports';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

function getMergeableDeclarations(
  declarations: TSESTree.ImportDeclaration[],
): TSESTree.ImportDeclaration[] {
  return declarations.filter((declaration) =>
    declaration.specifiers.every(
      (specifier) =>
        specifier.type !== TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier,
    ),
  );
}

function isTypeOnlyDeclaration(
  declaration: TSESTree.ImportDeclaration,
): boolean {
  return (
    declaration.importKind === 'type' ||
    declaration.specifiers.every(
      (specifier) =>
        specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
        specifier.importKind === 'type',
    )
  );
}

function getDefaultSpecifierText(
  declarations: TSESTree.ImportDeclaration[],
  sourceCode: Readonly<TSESLint.SourceCode>,
): string | undefined {
  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers) {
      if (specifier.type === TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier) {
        return sourceCode.getText(specifier);
      }
    }
  }
  return undefined;
}

function getMergedSpecifiers(
  declarations: TSESTree.ImportDeclaration[],
  sourceCode: Readonly<TSESLint.SourceCode>,
  isAllTypeOnly: boolean,
): string[] {
  const mergedSpecifiers: string[] = [];
  for (const declaration of declarations) {
    const isCurrentDeclarationTypeOnly = isTypeOnlyDeclaration(declaration);
    for (const specifier of declaration.specifiers) {
      if (specifier.type === TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier) {
        continue;
      }
      const specifierText = sourceCode.getText(specifier);
      if (isAllTypeOnly) {
        mergedSpecifiers.push(specifierText.replace('type ', ''));
      } else if (isCurrentDeclarationTypeOnly) {
        mergedSpecifiers.push(`type ${specifierText}`);
      } else {
        mergedSpecifiers.push(specifierText);
      }
    }
  }
  return mergedSpecifiers;
}

function reportDuplicatedImports(
  context: Readonly<TSESLint.RuleContext<'mergeDuplicatedImports', []>>,
  sourceCode: Readonly<TSESLint.SourceCode>,
  moduleName: string,
  declarations: TSESTree.ImportDeclaration[],
): void {
  const firstDeclaration = declarations[0];
  assert.ok(firstDeclaration);
  const isAllTypeOnly = declarations.every(isTypeOnlyDeclaration);

  context.report({
    messageId: 'mergeDuplicatedImports',
    node: firstDeclaration,
    fix(fixer) {
      const fixes: TSESLint.RuleFix[] = [];
      const defaultSpecifierText = getDefaultSpecifierText(
        declarations,
        sourceCode,
      );
      const mergedSpecifiers = getMergedSpecifiers(
        declarations,
        sourceCode,
        isAllTypeOnly,
      );
      const mergedSpecifiersText = `${isAllTypeOnly ? 'type ' : ''}{ ${mergedSpecifiers.join(', ')} }`;
      const mergedImport = `import ${[defaultSpecifierText, mergedSpecifiersText].filter(Boolean).join(', ')} from '${moduleName}';`;
      fixes.push(fixer.replaceText(firstDeclaration, mergedImport));

      for (const declaration of declarations.slice(1)) {
        fixes.push(
          fixer.removeRange([declaration.range[0], declaration.range[1] + 1]),
        );
      }

      return fixes;
    },
  });
}

const rule: ESLintUtils.RuleModule<'mergeDuplicatedImports'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Merge duplicated import statements with the same "from".',
    },
    messages: {
      mergeDuplicatedImports:
        'Merge duplicated import statements with the same "from".',
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
        for (const [
          moduleName,
          allDeclarations,
        ] of importDeclarations.entries()) {
          const declarations = getMergeableDeclarations(allDeclarations);
          if (declarations.length <= 1) {
            continue;
          }
          reportDuplicatedImports(
            context,
            sourceCode,
            moduleName,
            declarations,
          );
        }
      },
    };
  },
});

export default rule;
