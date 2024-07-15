// no-side-effects.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node } from 'estree';
import type { Rule } from 'eslint';

interface RuleOptions {
  excludedIdentifiers: string[];
}

// To check if it is an await expression i.e await someFunction()
function isAwaitExpression(statement: Node): boolean {
  return statement.type === 'ExpressionStatement' && statement.expression.type === 'AwaitExpression';
}

// To check if it is a call expression with a member expression i.e module.method()
function isCallExpressionCalleeMemberExpression(statement: Node, excludedIdentifiers: string[]): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'MemberExpression' &&
    statement.expression.callee.object.type === 'Identifier' &&
    !excludedIdentifiers.includes(statement.expression.callee.object.name)
  );
}

// To check if it is a variable declaration with an await expression i.e  const configuration = await someFunction();
function isVariableDeclarationAwaitExpression(node: Node): boolean {
  return (
    node.type === 'VariableDeclaration' &&
    node.declarations.length > 0 &&
    node.declarations[0]?.id !== undefined &&
    node.declarations[0].id.type === 'Identifier' &&
    node.declarations[0].init !== undefined &&
    node.declarations[0].init !== null &&
    node.declarations[0].init.type === 'AwaitExpression'
  );
}

// To check if it is a variable declaration with an identifier i.e function()
function isVariableDeclarationIdentifier(node: Node, excludedIdentifiers: string[]): boolean {
  return (
    node.type === 'VariableDeclaration' &&
    node.declarations.length > 0 &&
    node.declarations[0]?.id !== undefined &&
    node.declarations[0].id.type === 'Identifier' &&
    node.declarations[0].init !== undefined &&
    node.declarations[0].init !== null &&
    node.declarations[0].init.type === 'CallExpression' &&
    node.declarations[0].init.callee.type === 'Identifier' &&
    !excludedIdentifiers.includes(node.declarations[0].init.callee.name)
  );
}

// To check if it is a variable declaration with a member expression i.e const test = module.method()
function isVariableDeclarationMemberExpression(node: Node): boolean {
  return (
    node.type === 'VariableDeclaration' &&
    node.declarations.length > 0 &&
    node.declarations[0]?.id !== undefined &&
    node.declarations[0].id.type === 'Identifier' &&
    node.declarations[0].init !== undefined &&
    node.declarations[0].init !== null &&
    node.declarations[0].init.type === 'CallExpression' &&
    node.declarations[0].init.callee.type === 'MemberExpression' &&
    ((node.declarations[0].init.callee.object.type === 'NewExpression' &&
      node.declarations[0].init.callee.object.callee.type === 'Identifier') ||
      node.declarations[0].init.callee.object.type === 'Identifier')
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure no side effects can occur at the module-level',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    schema: [
      {
        type: 'object',
        properties: {
          excludedIdentifiers: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options: RuleOptions = (context.options[0] ?? {}) as RuleOptions;
    const excludedIdentifiers = options.excludedIdentifiers.length > 0 ? options.excludedIdentifiers : [];

    return {
      Program(node) {
        node.body.forEach((statement) => {
          if (
            isAwaitExpression(statement) ||
            isCallExpressionCalleeMemberExpression(statement, excludedIdentifiers) ||
            isVariableDeclarationAwaitExpression(statement) ||
            isVariableDeclarationIdentifier(statement, excludedIdentifiers) ||
            isVariableDeclarationMemberExpression(statement)
          ) {
            context.report({
              node: statement,
              message: 'No side effects can occur at the module-level',
            });
          }
        });
      },
    };
  },
} as Rule.RuleModule;
