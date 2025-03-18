// no-random-v4-uuid.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-random-v4-uuid';
const NO_RANDOM_V4_UUID = 'NO_RANDOM_V4_UUID';
const NO_UUID_MODULE_FOR_V4 = 'NO_UUID_MODULE_FOR_V4';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

interface Aliases {
  uuid4Alias?: string;
  uuidDefaultAlias?: string;
  nodeCryptoRandomUUIDAlias?: string;
}

const processImportDeclaration = (node: TSESTree.ImportDeclaration, aliases: Aliases) => {
  node.specifiers.forEach((specifier) => {
    if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
      if (
        node.source.value === 'uuid' &&
        specifier.imported.type === AST_NODE_TYPES.Identifier &&
        specifier.imported.name === 'v4'
      ) {
        aliases.uuid4Alias = specifier.local.name;
      } else if (
        node.source.value === 'node:crypto' &&
        specifier.imported.type === AST_NODE_TYPES.Identifier &&
        specifier.imported.name === 'randomUUID'
      ) {
        aliases.nodeCryptoRandomUUIDAlias = specifier.local.name;
      }
    } else if (specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier && node.source.value === 'uuid') {
      aliases.uuidDefaultAlias = specifier.local.name;
    }
  });
};

const isUuid4Call = (node: TSESTree.CallExpression, aliases: Aliases): boolean =>
  (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === aliases.uuid4Alias) ||
  (node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.object.name === aliases.uuidDefaultAlias &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'v4');

const isCryptoRandomUUIDCall = (node: TSESTree.CallExpression, alias?: string): boolean =>
  (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === alias) ||
  (node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.object.name === 'crypto' &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'randomUUID');

const rule: TSESLint.RuleModule<typeof NO_RANDOM_V4_UUID | typeof NO_UUID_MODULE_FOR_V4> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the use of `uuid.v4` and `crypto.randomUUID` for generating random v4 UUIDs, and suggest replacing `uuid` module usage with `crypto.randomUUID`.',
    },
    schema: [],
    messages: {
      [NO_RANDOM_V4_UUID]: 'Avoid using `crypto.randomUUID` for generating random v4 UUIDs.',
      [NO_UUID_MODULE_FOR_V4]: 'Avoid using the `uuid` module for v4 UUID generation. Use `crypto.randomUUID` instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    const aliases: Aliases = {};

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        processImportDeclaration(node, aliases);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isUuid4Call(node, aliases)) {
          context.report({
            node,
            messageId: NO_UUID_MODULE_FOR_V4,
          });
        } else if (isCryptoRandomUUIDCall(node, aliases.nodeCryptoRandomUUIDAlias)) {
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
