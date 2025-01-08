// require-ts-extension-imports-exports.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import path from 'path';
import fs from 'fs';
import { ESLintUtils, TSESLint } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/types';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-ts-extension-imports-exports';
const REQUIRE_TS_EXTENSION_IMPORTS = 'REQUIRE-TS-EXTENSION-IMPORTS';
const REQUIRE_TS_EXTENSION_EXPORTS = 'REQUIRE-TS-EXTENSION-EXPORTS';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const checkPath = (filename: string, filePath: string): { fixedPath: string | null; isFixNeeded: boolean } => {
  if (filePath.startsWith('.') && !filePath.endsWith('.ts') && !filePath.endsWith('.json')) {
    const absolutePath = path.resolve(path.dirname(filename), filePath);
    const tsPath = `${absolutePath}.ts`;
    const existsPath = [absolutePath, tsPath].find(fs.existsSync);
    if (existsPath !== undefined) {
      const stats = fs.statSync(existsPath);
      const isDirectory = stats.isDirectory();
      const fixedPath = isDirectory ? `${filePath}/index.ts` : `${filePath}.ts`;
      return { fixedPath, isFixNeeded: true };
    }
  }
  return { fixedPath: null, isFixNeeded: false };
};

const rule: TSESLint.RuleModule<string, unknown[]> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure .ts extension is at the end of all imports and exports',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [REQUIRE_TS_EXTENSION_IMPORTS]: 'Import paths should end with .ts extension',
      [REQUIRE_TS_EXTENSION_EXPORTS]: 'Export paths should end with .ts extension',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;

    const handleDeclaration = (node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration) => {
      if (node.source !== null) {
        const importPath = node.source.value;
        const { fixedPath, isFixNeeded } = checkPath(filename, importPath);
        if (isFixNeeded && fixedPath !== null) {
          context.report({
            loc: node.source.loc,
            messageId:
              node.type === TSESTree.AST_NODE_TYPES.ImportDeclaration
                ? REQUIRE_TS_EXTENSION_IMPORTS
                : REQUIRE_TS_EXTENSION_EXPORTS,
            *fix(fixer) {
              yield fixer.replaceText(node.source, `'${fixedPath}'`);
            },
          });
        }
      }
    };

    return {
      ImportDeclaration(node) {
        handleDeclaration(node);
      },
      ExportNamedDeclaration(node) {
        handleDeclaration(node);
      },
    };
  },
});

export default rule;
