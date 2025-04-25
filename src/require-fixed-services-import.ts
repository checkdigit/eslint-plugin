// require-fixed-services-import.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import path from 'node:path';

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'require-fixed-services-import';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const SERVICE_TYPINGS_IMPORT_PATH = /(?<path>\.\.\/)+services(?!\/index(?:\.ts)?)\/.*/u;
const SERVICE_TYPINGS_IMPORT_PATH_WITH_VERSION =
  /(?<path>\.\.\/)+services\/(?<service>\w+)\/(?<version>v\d+)(?<index>\/index(?:\.ts)?)?/u;

const rule: ESLintUtils.RuleModule<
  'updateServicesImportSpecifier' | 'updateServicesImportSource' | 'renameServiceTypeReference'
> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require fixed "from" with service typing imports from "src/services".',
    },
    messages: {
      updateServicesImportSpecifier:
        'Update service typing import specifiers to be from the corresponding service version namespace.',
      updateServicesImportSource: 'Update service typing imports to be from the fixed "src/services" path.',
      renameServiceTypeReference: 'Rename service type reference using the corresponding service version namespace.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const importedServiceTypeMapping = new Map<string, string>();
    const fileFolder = path.dirname(context.filename);

    return {
      ImportDeclaration(importDeclaration) {
        const moduleName = importDeclaration.source.value; /*?*/
        const resolvedModulePath = path.resolve(fileFolder, moduleName); /*?*/
        if (!resolvedModulePath.includes('src/services')) {
          return;
        }

        if (SERVICE_TYPINGS_IMPORT_PATH.test(moduleName)) {
          // make sure that it matches only the src/services path
          const match = SERVICE_TYPINGS_IMPORT_PATH_WITH_VERSION.exec(moduleName);
          if (match?.groups) {
            // need to import the service typings from the fixed path, and also apply the namespace to the referenced types
            const { service, version } = match.groups;
            assert.ok(service !== undefined && version !== undefined);

            // remember the type name and the corresponding service, which will be used to rename the references
            for (const specifier of importDeclaration.specifiers) {
              if (
                specifier.type === AST_NODE_TYPES.ImportSpecifier &&
                specifier.imported.type === AST_NODE_TYPES.Identifier
              ) {
                importedServiceTypeMapping.set(specifier.local.name, `${service}.${specifier.imported.name}`);
              }
            }

            const rangeStart = importDeclaration.specifiers[0]?.range[0];
            assert.ok(rangeStart !== undefined);
            const rangeEnd = importDeclaration.specifiers.at(-1)?.range[1];
            assert.ok(rangeEnd !== undefined);
            // import the service typings using our naming convension
            context.report({
              messageId: 'updateServicesImportSpecifier',
              node: importDeclaration.source,
              *fix(fixer) {
                yield fixer.replaceTextRange([rangeStart, rangeEnd], `${service}V${version.slice(1)} as ${service}`);
              },
            });
          }

          // update the imported source to be the fixed path
          context.report({
            messageId: 'updateServicesImportSource',
            node: importDeclaration.source,
            *fix(fixer) {
              yield fixer.replaceText(
                importDeclaration.source,
                `'${moduleName.slice(0, moduleName.indexOf('../services'))}../services/index.ts'`,
              );
            },
          });
        }
      },

      TSTypeReference(typeReference: TSESTree.TSTypeReference) {
        if (
          typeReference.typeName.type === AST_NODE_TYPES.Identifier &&
          importedServiceTypeMapping.has(typeReference.typeName.name)
        ) {
          const renamedTypeName = importedServiceTypeMapping.get(typeReference.typeName.name);
          assert.ok(renamedTypeName !== undefined);
          context.report({
            messageId: 'renameServiceTypeReference',
            node: typeReference.typeName,
            fix(fixer) {
              return fixer.replaceText(typeReference.typeName, renamedTypeName);
            },
          });
        }
      },
    };
  },
});

export default rule;
