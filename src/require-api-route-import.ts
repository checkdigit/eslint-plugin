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

const API_INDEX_FILE_PATH = /\/src\/api\/v\d+\/index\.ts$/u;
const API_FILE_PATH = /\/src\/api\/v\d+\/[^/]+\.ts$/u;
const TEST_OR_DECLARATION_FILE_NAME = /\.(?:spec|test|d)\.ts$/u;
const ROUTER_INSTANTIATION = /\bnew\s+Router\b/u;

function removeExtension(filePath: string): string {
  return filePath.replace(/\.[cm]?[jt]s$/u, '');
}

const rule: ESLintUtils.RuleModule<
  'requireApiRouteImport' | 'requireImportByApiIndex'
> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every API route implementation in "src/api/v{N}" to be imported by the folder\'s "index.ts".',
    },
    messages: {
      requireApiRouteImport:
        'API route implementation "{{ routeFileName }}" is not imported, so its routes will not be served.',
      requireImportByApiIndex:
        'API route implementation is not imported by "index.ts", so its routes will not be served.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filePath = context.filename.replaceAll('\\', '/');
    const apiFolder = path.dirname(context.filename);

    if (API_INDEX_FILE_PATH.test(filePath)) {
      const importedFilePaths = new Set<string>();

      return {
        ImportDeclaration(importDeclaration) {
          const moduleName = importDeclaration.source.value;
          if (moduleName.startsWith('.')) {
            importedFilePaths.add(
              removeExtension(path.resolve(apiFolder, moduleName)),
            );
          }
        },

        'Program:exit'() {
          const routeFileNames = fs
            .readdirSync(apiFolder, { withFileTypes: true })
            .filter(
              (entry) =>
                entry.isFile() &&
                entry.name.endsWith('.ts') &&
                entry.name !== 'index.ts' &&
                !TEST_OR_DECLARATION_FILE_NAME.test(entry.name),
            )
            .map((entry) => entry.name)
            .filter((fileName) =>
              ROUTER_INSTANTIATION.test(
                fs.readFileSync(path.join(apiFolder, fileName), 'utf8'),
              ),
            )
            .toSorted((first, second) => first.localeCompare(second));

          for (const routeFileName of routeFileNames) {
            if (
              !importedFilePaths.has(
                removeExtension(path.join(apiFolder, routeFileName)),
              )
            ) {
              context.report({
                messageId: 'requireApiRouteImport',
                // the whole file is the offending scope, so point at its start rather than underlining everything
                loc: { line: 1, column: 0 },
                data: { routeFileName },
              });
            }
          }
        },
      };
    }

    if (
      API_FILE_PATH.test(filePath) &&
      !TEST_OR_DECLARATION_FILE_NAME.test(filePath)
    ) {
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
              messageId: 'requireImportByApiIndex',
              node: newExpression,
            });
          }
        },
      };
    }

    return {};
  },
});

export default rule;
