// no-random-v4-uuid.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-random-v4-uuid';
const NO_RANDOM_V4_UUID = 'NO_RANDOM_V4_UUID';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

// process the import declaration to get the alias for uuid.v4 and uuid.
const processImportDeclaration = (
  node: TSESTree.ImportDeclaration,
  uuid4Alias: string | undefined,
  uuidDefaultAlias: string | undefined,
) => {
  let updatedUuid4Alias = uuid4Alias;
  let updatedUuidDefaultAlias = uuidDefaultAlias;
  node.specifiers.forEach((specifier) => {
    switch (specifier.type) {
      case AST_NODE_TYPES.ImportSpecifier:
        if (specifier.imported.type === AST_NODE_TYPES.Identifier && specifier.imported.name === 'v4') {
          updatedUuid4Alias = specifier.local.name;
        }
        break;
      case AST_NODE_TYPES.ImportDefaultSpecifier:
        updatedUuidDefaultAlias = specifier.local.name;
        break;
    }
  });
  return { uuid4Alias: updatedUuid4Alias, uuidDefaultAlias: updatedUuidDefaultAlias };
};

// checks if the function call is either directly using the alias for uuid.v4 or using uuid.v4 as a member expression.
const isUuid4Call = (
  node: TSESTree.CallExpression,
  uuid4Alias: string | undefined,
  uuidDefaultAlias: string | undefined,
): boolean =>
  (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === uuid4Alias) ||
  (node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.object.name === uuidDefaultAlias &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'v4');

const rule: TSESLint.RuleModule<typeof NO_RANDOM_V4_UUID> = createRule({
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
    let uuid4Alias: string | undefined;
    let uuidDefaultAlias: string | undefined;
    let hasUuidImport = false;

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'uuid') {
          hasUuidImport = true;
          const result = processImportDeclaration(node, uuid4Alias, uuidDefaultAlias);
          uuid4Alias = result.uuid4Alias;
          uuidDefaultAlias = result.uuidDefaultAlias;
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (hasUuidImport && isUuid4Call(node, uuid4Alias, uuidDefaultAlias)) {
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
