// require-ts-extension-imports.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import fs from 'node:fs';
import { ESLintUtils } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-ts-extension-imports';
const REQUIRE_TS_EXTENSION_IMPORTS = 'REQUIRE-TS-EXTENSION-IMPORTS';

const createRule: ReturnType<typeof ESLintUtils.RuleCreator> = ESLintUtils.RuleCreator((name) =>
  getDocumentationUrl(name),
);

const rule: ReturnType<typeof createRule> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure .ts extension is at the end of all imports',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [REQUIRE_TS_EXTENSION_IMPORTS]: 'Import paths should end with .ts extension',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;
    if (!filename.endsWith('.ts')) {
      return {};
    }
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (
          importPath.startsWith('.') &&
          !importPath.endsWith('.ts') &&
          !importPath.endsWith('.json') &&
          fs.existsSync(importPath)
        ) {
          const stats = fs.statSync(importPath);
          const isDirectory = stats.isDirectory();
          context.report({
            node: node.source,
            messageId: REQUIRE_TS_EXTENSION_IMPORTS,
            fix(fixer) {
              const fixedPath = isDirectory ? `${importPath}/index.ts` : `${importPath}.ts`;
              return fixer.replaceText(node.source, `'${fixedPath}'`);
            },
          });
        }
      },
    };
  },
});

export default rule;