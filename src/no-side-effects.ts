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

function isAwaitExpression(statement: Node): boolean {
  return statement.type === 'ExpressionStatement' && statement.expression.type === 'AwaitExpression';
}

function isCallExpressionCalleeMemberExpression(statement: Node, excludedIdentifiers: string[]): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'MemberExpression' &&
    statement.expression.callee.object.type === 'Identifier' &&
    !excludedIdentifiers.includes(statement.expression.callee.object.name)
  );
}

function isCallExpressionCalleeIdentifier(statement: Node, excludedIdentifiers: string[]): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'Identifier' &&
    !excludedIdentifiers.includes(statement.expression.callee.name)
  );
}

function isVariableDeclarationAwaitExpression(statement: Node): boolean {
  return (
    statement.type === 'VariableDeclaration' &&
    statement.declarations.length > 0 &&
    statement.declarations[0]?.id !== undefined &&
    statement.declarations[0].id.type === 'Identifier' &&
    statement.declarations[0].init !== undefined &&
    statement.declarations[0].init !== null &&
    statement.declarations[0].init.type === 'AwaitExpression'
  );
}

function isVariableDeclarationIdentifier(statement: Node, excludedIdentifiers: string[]): boolean {
  return (
    statement.type === 'VariableDeclaration' &&
    statement.declarations.length > 0 &&
    statement.declarations[0]?.id !== undefined &&
    statement.declarations[0].id.type === 'Identifier' &&
    statement.declarations[0].init !== undefined &&
    statement.declarations[0].init !== null &&
    statement.declarations[0].init.type === 'CallExpression' &&
    statement.declarations[0].init.callee.type === 'Identifier' &&
    !excludedIdentifiers.includes(statement.declarations[0].init.callee.name)
  );
}

function isVariableDeclarationMemberExpression(statement: Node): boolean {
  return (
    statement.type === 'VariableDeclaration' &&
    statement.declarations.length > 0 &&
    statement.declarations[0]?.id !== undefined &&
    statement.declarations[0].id.type === 'Identifier' &&
    statement.declarations[0].init !== undefined &&
    statement.declarations[0].init !== null &&
    statement.declarations[0].init.type === 'CallExpression' &&
    statement.declarations[0].init.callee.type === 'MemberExpression' &&
    ((statement.declarations[0].init.callee.object.type === 'NewExpression' &&
      statement.declarations[0].init.callee.object.callee.type === 'Identifier') ||
      statement.declarations[0].init.callee.object.type === 'Identifier')
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure no side effects can occur at the main module-level',
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
            isCallExpressionCalleeIdentifier(statement, excludedIdentifiers) ||
            isVariableDeclarationAwaitExpression(statement) ||
            isVariableDeclarationIdentifier(statement, excludedIdentifiers) ||
            isVariableDeclarationMemberExpression(statement)
          ) {
            context.report({
              node: statement,
              message: 'No side effects can occur at the main module-level',
            });
          }
        });
      },
    };
  },
} as Rule.RuleModule;
