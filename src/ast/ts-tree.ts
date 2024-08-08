// tree.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

type NodeParent = TSESTree.Node | undefined | null;

interface NodeParentExtension {
  parent: NodeParent;
}

export function getParent(node: TSESTree.Node): TSESTree.Node | undefined | null {
  return (node as unknown as NodeParentExtension).parent;
}

export function getAncestor(
  node: TSESTree.Node,
  matcher: AST_NODE_TYPES | ((testNode: TSESTree.Node) => boolean),
  exitMatcher?: AST_NODE_TYPES | ((testNode: TSESTree.Node) => boolean),
): TSESTree.Node | undefined {
  const parent = getParent(node);
  if (!parent) {
    return undefined;
  } else if (typeof matcher === 'string' && parent.type === matcher) {
    return parent;
  } else if (typeof matcher === 'function' && matcher(parent)) {
    return parent;
  } else if (typeof exitMatcher === 'string' && parent.type === exitMatcher) {
    return undefined;
  } else if (typeof exitMatcher === 'function' && exitMatcher(parent)) {
    return undefined;
  }
  return getAncestor(parent, matcher, exitMatcher);
}

export function isBlockStatement(node: TSESTree.Node) {
  return node.type.endsWith('Statement') || node.type.endsWith('Declaration');
}

export function getEnclosingStatement(node: TSESTree.Node) {
  return getAncestor(node, isBlockStatement);
}

export function getEnclosingScopeNode(node: TSESTree.Node) {
  return getAncestor(node, (parentNode) =>
    ['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression', 'Program'].includes(parentNode.type),
  );
}

export function isUsedInArrayOrAsArgument(node: TSESTree.Node) {
  if (isBlockStatement(node)) {
    return false;
  }

  const parent = getParent(node);
  if (!parent) {
    return false;
  }

  if (
    parent.type === AST_NODE_TYPES.ArrayExpression ||
    (parent.type === AST_NODE_TYPES.CallExpression && parent.arguments.includes(node as TSESTree.Expression))
  ) {
    return true;
  }

  // recurse up the tree until hitting a block statement
  return isUsedInArrayOrAsArgument(parent);
}

export function getEnclosingFunction(node: TSESTree.Node) {
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return node;
  }

  const parent = getParent(node);
  if (!parent) {
    return;
  }
  return getEnclosingFunction(parent);
}
