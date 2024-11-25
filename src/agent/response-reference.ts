// agent/response-reference.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import debug from 'debug';

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import type { ScopeManager, Variable } from '@typescript-eslint/scope-manager';
import { getParent } from '../library/ts-tree';

const log = debug('eslint-plugin:response-reference');

/**
 * analyze response related variables and their references
 * the implementation is for fixture API, but it can be used for fetch API as well since the tree structure is similar
 * @param variableDeclaration - variable declaration node
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function analyzeResponseReferences(
  variableDeclaration: TSESTree.VariableDeclaration | undefined,
  scopeManager: ScopeManager,
): {
  variable?: Variable;
  bodyReferences: TSESTree.MemberExpression[];
  // headersReferences: TSESTree.MemberExpression[];
  statusReferences: TSESTree.MemberExpression[];
  destructuringBodyVariable?: Variable | TSESTree.ObjectPattern;
  destructuringHeadersVariable?: Variable | TSESTree.ObjectPattern;
  destructuringStatusVariable?: Variable | TSESTree.ObjectPattern;
  destructuringHeadersReferences?: TSESTree.MemberExpression[] | undefined;
} {
  const results: {
    variable?: Variable;
    bodyReferences: TSESTree.MemberExpression[];
    // headersReferences: TSESTree.MemberExpression[];
    statusReferences: TSESTree.MemberExpression[];
    destructuringBodyVariable?: Variable | TSESTree.ObjectPattern;
    destructuringHeadersVariable?: Variable | TSESTree.ObjectPattern;
    destructuringStatusVariable?: Variable | TSESTree.ObjectPattern;
    destructuringHeadersReferences?: TSESTree.MemberExpression[] | undefined;
  } = {
    bodyReferences: [],
    // headersReferences: [],
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
    if (identifierParent.type === AST_NODE_TYPES.VariableDeclarator) {
      // e.g. const response = ...
      results.variable = responseVariable;
      const responseReferences = responseVariable.references.map((responseReference) =>
        getParent(responseReference.identifier),
      );
      // e.g. response.body
      results.bodyReferences = responseReferences.filter(
        (node): node is TSESTree.MemberExpression =>
          node?.type === AST_NODE_TYPES.MemberExpression &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'body',
      );
      // // e.g. response.headers / response.header / response.get()
      // results.headersReferences = responseReferences.filter(
      //   (node): node is TSESTree.MemberExpression =>
      //     node?.type === AST_NODE_TYPES.MemberExpression &&
      //     node.property.type === AST_NODE_TYPES.Identifier &&
      //     (node.property.name === 'header' || node.property.name === 'headers' || node.property.name === 'get'),
      // );
      // e.g. response.status / response.statusCode
      results.statusReferences = responseReferences.filter(
        (node): node is TSESTree.MemberExpression =>
          node?.type === AST_NODE_TYPES.MemberExpression &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          (node.property.name === 'status' || node.property.name === 'statusCode'),
      );
    } else if (
      // body reference through destruction/renaming, e.g. "const { body } = ..."
      identifierParent.type === AST_NODE_TYPES.Property &&
      identifierParent.key.type === AST_NODE_TYPES.Identifier &&
      identifierParent.key.name === 'body'
    ) {
      results.destructuringBodyVariable = responseVariable;
    } else if (
      // body reference through destruction/renaming, e.g. "const { body } = ..."
      identifierParent.type === AST_NODE_TYPES.Property &&
      identifierParent.key.type === AST_NODE_TYPES.Identifier &&
      (identifierParent.key.name === 'status' || identifierParent.key.name === 'statusCode')
    ) {
      results.destructuringStatusVariable = responseVariable;
    } else if (
      // header reference through destruction/renaming, e.g. "const { headers } = ..."
      identifierParent.type === AST_NODE_TYPES.Property &&
      identifierParent.key.type === AST_NODE_TYPES.Identifier &&
      identifierParent.key.name === 'headers'
    ) {
      results.destructuringHeadersVariable = responseVariable;
      results.destructuringHeadersReferences = responseVariable.references
        .map((reference) => reference.identifier)
        .map(getParent)
        .filter(
          (parent): parent is TSESTree.MemberExpression =>
            parent?.type === AST_NODE_TYPES.MemberExpression &&
            parent.property.type === AST_NODE_TYPES.Identifier &&
            parent.property.name !== 'get' &&
            getParent(parent)?.type !== AST_NODE_TYPES.CallExpression,
        );
    } else if (identifierParent.type === AST_NODE_TYPES.Property) {
      const parent = getParent(identifierParent);
      if (parent?.type === AST_NODE_TYPES.ObjectPattern) {
        // body reference through nested destruction, e.g. "const { body: {bodyPropertyName: renamedBodyPropertyName}, headers: {headerPropertyName: renamedHeaderPropertyName} } = ..."
        const parent2 = getParent(parent);
        if (
          parent2?.type === AST_NODE_TYPES.Property &&
          parent2.key.type === AST_NODE_TYPES.Identifier &&
          parent2.key.name === 'body'
        ) {
          results.destructuringBodyVariable = parent;
        }
        if (
          parent2?.type === AST_NODE_TYPES.Property &&
          parent2.key.type === AST_NODE_TYPES.Identifier &&
          (parent2.key.name === 'status' || parent2.key.name === 'statusCode')
        ) {
          results.destructuringStatusVariable = parent;
        }
        if (
          parent2?.type === AST_NODE_TYPES.Property &&
          parent2.key.type === AST_NODE_TYPES.Identifier &&
          (parent2.key.name === 'header' || parent2.key.name === 'headers')
        ) {
          results.destructuringHeadersVariable = parent;
        }
      }
    } else {
      log('+++++++ can not handle identifierParent', identifierParent);
      throw new Error(`Unknown response variable reference: ${responseVariable.name}`);
    }
  }
  return results;
}
