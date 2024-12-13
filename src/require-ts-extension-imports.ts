// require-ts-extension-imports.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-ts-extension-imports';
const REQUIRE_TS_EXTENSION_IMPORTS = 'REQUIRE-TS-EXTENSION-IMPORTS';
const SERVICE_TYPINGS_IMPORT_PATH_PREFIX = /(?<path>\.\.\/)+services/u;

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
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (
          importPath.startsWith('.') &&
          !importPath.endsWith('.ts') &&
          !importPath.endsWith('.json') &&
          !SERVICE_TYPINGS_IMPORT_PATH_PREFIX.test(importPath)
        ) {
          context.report({
            loc: node.source.loc,
            messageId: REQUIRE_TS_EXTENSION_IMPORTS,
            *fix(fixer) {
              yield fixer.replaceText(node.source, `'${importPath}.ts'`);
            },
          });
        }
      },
    };
  },
});

export default rule;
