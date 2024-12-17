// no-serve-runtime.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-serve-runtime';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'noServeRuntime'> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: '@checkdigit/serve-runtime should not be used.',
    },
    messages: {
      noServeRuntime: 'Please remove the usage of @checkdigit/serve-runtime.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration: (importDeclaration: TSESTree.ImportDeclaration) => {
        if (importDeclaration.source.value === '@checkdigit/serve-runtime') {
          context.report({
            messageId: 'noServeRuntime',
            node: importDeclaration,
          });
        }
      },
    };
  },
});

export default rule;
