// no-random-v4-uuid.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'no-random-v4-uuid';
const NO_RANDOM_V4_UUID = 'NO_RANDOM_V4_UUID';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

// process the import declaration to get the alias for uuid.v4 and uuid.
const processImportDeclaration = (
  node: TSESTree.ImportDeclaration,
  uuid4Alias: { current: string | null },
  uuidDefaultAlias: { current: string | null },
) => {
  node.specifiers.forEach((specifier) => {
    switch (specifier.type) {
      case AST_NODE_TYPES.ImportSpecifier:
        if (specifier.imported.name === 'v4') {
          uuid4Alias.current = specifier.local.name;
        }
        break;
      case AST_NODE_TYPES.ImportDefaultSpecifier:
        uuidDefaultAlias.current = specifier.local.name;
        break;
    }
  });
};

// checks if the function call is either directly using the alias for uuid.v4 or using uuid.v4 as a member expression.
const isUuid4Call = (
  node: TSESTree.CallExpression,
  uuid4Alias: string | null,
  uuidDefaultAlias: string | null,
): boolean =>
  (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === uuid4Alias) ||
  (node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.object.name === uuidDefaultAlias &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'v4');

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `uuid.v4` for generating random v4 UUIDs',
    },
    schema: [],
    messages: {
      [NO_RANDOM_V4_UUID]: 'Avoid using `uuid.v4` for generating random v4 UUIDs.',
    },
  },
  defaultOptions: [],
  create(context) {
    const uuid4Alias = { current: null };
    const uuidDefaultAlias = { current: null };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'uuid') {
          processImportDeclaration(node, uuid4Alias, uuidDefaultAlias);
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isUuid4Call(node, uuid4Alias.current, uuidDefaultAlias.current)) {
          context.report({
            node,
            messageId: NO_RANDOM_V4_UUID,
          });
        }
      },
    };
  },
});

export default rule;
