// agent/fetch.ts

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import { getParent, isBlockStatement } from '../library/ts-tree';

export function getResponseBodyRetrievalText(responseVariableName: string) {
  return `await ${responseVariableName}.json()`;
}

export function getResponseStatusRetrievalText(responseVariableName: string) {
  return `${responseVariableName}.status`;
}

export function getResponseHeadersRetrievalText(responseVariableName: string) {
  return `${responseVariableName}.headers`;
}

export function isInvalidResponseHeadersAccess(responseHeadersAccess: TSESTree.Node): boolean {
  const responseHeaderAccessParent = getParent(responseHeadersAccess);
  if (responseHeaderAccessParent?.type === AST_NODE_TYPES.VariableDeclarator) {
    return false;
  }

  if (
    responseHeaderAccessParent?.type === AST_NODE_TYPES.CallExpression &&
    responseHeaderAccessParent.callee.type === AST_NODE_TYPES.MemberExpression &&
    responseHeaderAccessParent.callee.property.type === AST_NODE_TYPES.Identifier &&
    responseHeaderAccessParent.callee.property.name === 'get'
  ) {
    return true;
  }

  return !(
    responseHeaderAccessParent?.type === AST_NODE_TYPES.MemberExpression &&
    responseHeaderAccessParent.property.type === AST_NODE_TYPES.Identifier &&
    responseHeaderAccessParent.property.name === 'get'
  );
}

export function hasAssertions(fixtureCall: TSESTree.Node): boolean {
  if (isBlockStatement(fixtureCall)) {
    return false;
  }

  const parent = getParent(fixtureCall);
  if (!parent) {
    return false;
  }

  if (
    parent.type === AST_NODE_TYPES.MemberExpression &&
    parent.property.type === AST_NODE_TYPES.Identifier &&
    parent.property.name === 'expect' &&
    getParent(parent)?.type === AST_NODE_TYPES.CallExpression
  ) {
    return true;
  }

  return hasAssertions(parent);
}
