// require-fixed-services-import.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';

import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'require-fixed-services-import';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const SERVICE_TYPINGS_IMPORT_PATH_PREFIX = /(?<path>\.\.\/)+services(?!\/index(?:\.ts)?)\/.*/u;

const rule: ESLintUtils.RuleModule<'updateServicesImportFrom'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require fixed "from" with service typing imports from "src/services".',
    },
    messages: {
      updateServicesImportFrom: 'Update service typing imports to be from the fixed "src/services" path.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        const moduleName = node.source.value;
        if (SERVICE_TYPINGS_IMPORT_PATH_PREFIX.test(moduleName)) {
          context.report({
            messageId: 'updateServicesImportFrom',
            node: node.source,
            *fix(fixer) {
              yield fixer.replaceText(
                node.source,
                `'${moduleName.slice(0, moduleName.indexOf('../services') + '../services'.length)}'`,
              );
            },
          });
        }
      },
    };
  },
});

export default rule;
