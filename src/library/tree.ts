// library/tree.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Expression, Node } from 'estree';

type NodeParent = Node | undefined | null;

interface NodeParentExtension {
  parent: NodeParent;
}

export function getParent(node: Node): Node | undefined | null {
  return (node as unknown as NodeParentExtension).parent;
}

export function getAncestor(
  node: Node,
  matcher: string | ((testNode: Node) => boolean),
  exitMatcher?: string | ((testNode: Node) => boolean),
): Node | undefined {
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

export function isBlockStatement(node: Node): boolean {
  return node.type.endsWith('Statement') || node.type.endsWith('Declaration');
}

export function getEnclosingStatement(node: Node): Node | undefined {
  return getAncestor(node, isBlockStatement);
}

export function getEnclosingScopeNode(node: Node): Node | undefined {
  return getAncestor(node, (parentNode) =>
    ['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression', 'Program'].includes(parentNode.type),
  );
}

export function isUsedInArrayOrAsArgument(node: Node): boolean {
  if (isBlockStatement(node)) {
    return false;
  }

  const parent = getParent(node);
  if (!parent) {
    return false;
  }

  if (
    parent.type === 'ArrayExpression' ||
    parent.type === 'ArrowFunctionExpression' ||
    (parent.type === 'CallExpression' && parent.arguments.includes(node as Expression))
  ) {
    return true;
  }

  // recurse up the tree until hitting a block statement
  return isUsedInArrayOrAsArgument(parent);
}

export function getEnclosingFunction(
  node: Node,
):
  | import('estree').ArrowFunctionExpression
  | import('estree').FunctionExpression
  | import('estree').FunctionDeclaration
  | undefined {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    return node;
  }

  const parent = getParent(node);
  if (!parent) {
    return;
  }
  return getEnclosingFunction(parent);
}
