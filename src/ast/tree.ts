// tree.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node } from 'estree';

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

export function getEnclosingStatement(node: Node) {
  return getAncestor(
    node,
    (parentNode) => parentNode.type.endsWith('Statement') || parentNode.type.endsWith('Declaration'),
  );
}

export function getEnclosingScopeNode(node: Node) {
  return getAncestor(node, (parentNode) =>
    ['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression', 'Program'].includes(parentNode.type),
  );
}
