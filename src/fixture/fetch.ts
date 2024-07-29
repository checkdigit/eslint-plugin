// fixture/fetch.ts

import type { Node } from 'estree';
import { getParent } from '../ast/tree';

export function getResponseBodyRetrievalText(responseVariableName: string) {
  return `await ${responseVariableName}.json()`;
}

export function isInvalidResponseHeadersAccess(responseHeadersAccess: Node) {
  const responseHeaderAccessParent = getParent(responseHeadersAccess);
  if (responseHeaderAccessParent?.type === 'VariableDeclarator') {
    return false;
  }

  if (
    responseHeaderAccessParent?.type === 'CallExpression' &&
    responseHeaderAccessParent.callee.type === 'MemberExpression' &&
    responseHeaderAccessParent.callee.property.type === 'Identifier' &&
    responseHeaderAccessParent.callee.property.name === 'get'
  ) {
    return true;
  }

  return !(
    responseHeaderAccessParent?.type === 'MemberExpression' &&
    responseHeaderAccessParent.property.type === 'Identifier' &&
    responseHeaderAccessParent.property.name === 'get'
  );
}
