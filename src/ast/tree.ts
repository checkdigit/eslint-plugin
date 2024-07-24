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

export function getAncestor(node: Node, matcher: string | ((testNode: Node) => boolean), typeToExit?: string) {
  const parent = getParent(node);
  if (!parent || (typeToExit !== undefined && parent.type === typeToExit)) {
    return undefined;
  } else if (typeof matcher === 'string' && parent.type === matcher) {
    return parent;
  } else if (typeof matcher === 'function' && matcher(parent)) {
    return parent;
  }
  return getAncestor(parent, matcher, typeToExit);
}
