// require-api-route-import.ts

/*
 * Copyright (c) 2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import fs from 'node:fs';
import path from 'node:path';

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';

import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-api-route-import';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const API_FILE_PATH = /\/src\/api\/v\d+\/[^/]+\.ts$/u;
const EXCLUDED_FILE_NAME = /(?:\/index|\.spec|\.test|\.d)\.ts$/u;

function removeExtension(filePath: string): string {
  return filePath.replace(/\.[cm]?[jt]s$/u, '');
}

const rule: ESLintUtils.RuleModule<'requireApiRouteImport'> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every API route implementation in "src/api/v{N}" to be imported by the folder\'s "index.ts".',
    },
    messages: {
      requireApiRouteImport:
        'API route implementation is not imported by "index.ts", so its routes will not be served.',
    },
    schema: [],
  },
  create(context) {
    const filePath = context.filename.replaceAll('\\', '/');
    if (!API_FILE_PATH.test(filePath) || EXCLUDED_FILE_NAME.test(filePath)) {
      return {};
    }

    const apiFolder = path.dirname(context.filename);
    let isIndexChecked = false;

    return {
      'NewExpression[callee.name="Router"]'(
        newExpression: TSESTree.NewExpression,
      ) {
        const indexFilePath = path.join(apiFolder, 'index.ts');
        if (isIndexChecked || !fs.existsSync(indexFilePath)) {
          return;
        }
        isIndexChecked = true;

        // index.ts is read from disk rather than linted, so parse just its import list
        const isImportedByIndex = ts
          .preProcessFile(fs.readFileSync(indexFilePath, 'utf8'))
          .importedFiles.some(
            (importedFile) =>
              importedFile.fileName.startsWith('.') &&
              removeExtension(
                path.resolve(apiFolder, importedFile.fileName),
              ) === removeExtension(context.filename),
          );
        if (!isImportedByIndex) {
          context.report({
            messageId: 'requireApiRouteImport',
            node: newExpression,
          });
        }
      },
    };
  },
});

export default rule;
