// agent/fetch.ts

import type { Node } from 'estree';

import { getParent, isBlockStatement } from '../library/tree';

export function getResponseBodyRetrievalText(responseVariableName: string) {
  return `await ${responseVariableName}.json()`;
}

export function getResponseHeadersRetrievalText(responseVariableName: string) {
  return `${responseVariableName}.headers`;
}

export function isInvalidResponseHeadersAccess(responseHeadersAccess: Node): boolean {
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

export function hasAssertions(fixtureCall: Node): boolean {
  if (isBlockStatement(fixtureCall)) {
    return false;
  }

  const parent = getParent(fixtureCall);
  if (!parent) {
    return false;
  }

  if (
    parent.type === 'MemberExpression' &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'expect' &&
    getParent(parent)?.type === 'CallExpression'
  ) {
    return true;
  }

  return hasAssertions(parent);
}
