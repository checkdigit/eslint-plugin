// fixture/ts-tree.ts

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

export function getTypeParentNode(
  node: TSESTree.Node | undefined,
): TSESTree.TSTypeAnnotation | TSESTree.TSAsExpression | undefined {
  if (!node) {
    return undefined;
  }
  return node.type === AST_NODE_TYPES.TSTypeAnnotation || node.type === AST_NODE_TYPES.TSAsExpression
    ? node
    : getTypeParentNode(node.parent);
}
