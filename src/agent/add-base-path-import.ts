// agent/add-url-domain.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { getApiIndexPathByFilename } from './file';

export const ruleId = 'add-base-path-import';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'addBasePathImport'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Add import of BASE_PATH if it is used but not imported.',
    },
    messages: {
      addBasePathImport: 'Add import of BASE_PATH.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program: (program) => {
        const isBasePathUsed = sourceCode.text.includes(`$\{BASE_PATH}`);
        if (isBasePathUsed) {
          const topScope = sourceCode.getScope(program).childScopes[0];
          assert(topScope);
          if (topScope.variables.some((variable) => variable.name === 'BASE_PATH')) {
            return;
          }

          const apiIndexPath = getApiIndexPathByFilename(context.filename);
          if (apiIndexPath !== undefined) {
            const lastImportStatement = program.body.findLast(
              (statement) => statement.type === AST_NODE_TYPES.ImportDeclaration,
            );
            assert(lastImportStatement);

            const basePathImportStatement = `\nimport { BASE_PATH } from '${apiIndexPath}';\n`;
            context.report({
              node: program,
              messageId: 'addBasePathImport',
              fix(fixer) {
                return fixer.insertTextAfter(lastImportStatement, basePathImportStatement);
              },
            });
          }
        }
      },
    };
  },
});

export default rule;
