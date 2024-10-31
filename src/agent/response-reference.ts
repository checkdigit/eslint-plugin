// agent/response-reference.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import type { MemberExpression, ObjectPattern, VariableDeclaration } from 'estree';
import { type Scope } from 'eslint';
import debug from 'debug';

import { getParent } from '../library/tree';

const log = debug('eslint-plugin:response-reference');

/**
 * analyze response related variables and their references
 * the implementation is for fixture API, but it can be used for fetch API as well since the tree structure is similar
 * @param variableDeclaration - variable declaration node
 */
export function analyzeResponseReferences(
  variableDeclaration: VariableDeclaration | undefined,
  scopeManager: Scope.ScopeManager,
): {
  variable?: Scope.Variable;
  bodyReferences: MemberExpression[];
  headersReferences: MemberExpression[];
  statusReferences: MemberExpression[];
  destructuringBodyVariable?: Scope.Variable | ObjectPattern;
  destructuringHeadersVariable?: Scope.Variable;
  destructuringHeadersReferences?: MemberExpression[] | undefined;
} {
  const results: {
    variable?: Scope.Variable;
    bodyReferences: MemberExpression[];
    headersReferences: MemberExpression[];
    statusReferences: MemberExpression[];
    destructuringBodyVariable?: Scope.Variable | ObjectPattern;
    destructuringHeadersVariable?: Scope.Variable;
    destructuringHeadersReferences?: MemberExpression[] | undefined;
  } = {
    bodyReferences: [],
    headersReferences: [],
    statusReferences: [],
  };
  if (!variableDeclaration) {
    return results;
  }

  const responseVariables = scopeManager.getDeclaredVariables(variableDeclaration);
  for (const responseVariable of responseVariables) {
    const identifier = responseVariable.identifiers[0];
    assert.ok(identifier);
    const identifierParent = getParent(identifier);
    assert.ok(identifierParent);
    if (identifierParent.type === 'VariableDeclarator') {
      // e.g. const response = ...
      results.variable = responseVariable;
      const responseReferences = responseVariable.references.map((responseReference) =>
        getParent(responseReference.identifier),
      );
      // e.g. response.body
      results.bodyReferences = responseReferences.filter(
        (node): node is MemberExpression =>
          node?.type === 'MemberExpression' && node.property.type === 'Identifier' && node.property.name === 'body',
      );
      // e.g. response.headers / response.header / response.get()
      results.headersReferences = responseReferences.filter(
        (node): node is MemberExpression =>
          node?.type === 'MemberExpression' &&
          node.property.type === 'Identifier' &&
          (node.property.name === 'header' || node.property.name === 'headers' || node.property.name === 'get'),
      );
      // e.g. response.status / response.statusCode
      results.statusReferences = responseReferences.filter(
        (node): node is MemberExpression =>
          node?.type === 'MemberExpression' &&
          node.property.type === 'Identifier' &&
          (node.property.name === 'status' || node.property.name === 'statusCode'),
      );
    } else if (
      // body reference through destruction/renaming, e.g. "const { body } = ..."
      identifierParent.type === 'Property' &&
      identifierParent.key.type === 'Identifier' &&
      identifierParent.key.name === 'body'
    ) {
      results.destructuringBodyVariable = responseVariable;
    } else if (
      // header reference through destruction/renaming, e.g. "const { headers } = ..."
      identifierParent.type === 'Property' &&
      identifierParent.key.type === 'Identifier' &&
      identifierParent.key.name === 'headers'
    ) {
      results.destructuringHeadersVariable = responseVariable;
      results.destructuringHeadersReferences = responseVariable.references
        .map((reference) => reference.identifier)
        .map(getParent)
        .filter(
          (parent): parent is MemberExpression =>
            parent?.type === 'MemberExpression' &&
            parent.property.type === 'Identifier' &&
            parent.property.name !== 'get' &&
            getParent(parent)?.type !== 'CallExpression',
        );
    } else if (identifierParent.type === 'Property') {
      // body reference through nested destruction, e.g. "const { body: {bodyPropertyName: renamedBodyPropertyName}, headers: {headerPropertyName: renamedHeaderPropertyName} } = ..."
      const parent = getParent(identifierParent);
      if (parent?.type === 'ObjectPattern') {
        const parent2 = getParent(parent);
        if (parent2?.type === 'Property' && parent2.key.type === 'Identifier' && parent2.key.name === 'body') {
          results.destructuringBodyVariable = parent;
        }
      }
    } else {
      log('+++++++ can not handle identifierParent', identifierParent);
      throw new Error(`Unknown response variable reference: ${responseVariable.name}`);
    }
  }
  return results;
}
