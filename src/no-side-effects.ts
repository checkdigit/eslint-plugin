// no-side-effects.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node } from 'estree';
import type { Rule } from 'eslint';

const EXCLUDED_IDENTIFIERS = ['assert', 'debug', 'log'];

function isTestFile(fileName: string): boolean {
  return fileName.endsWith('spec.ts') || fileName.endsWith('test.ts') || fileName.endsWith('test.js');
}

function isAwaitExpression(statement: Node): boolean {
  return statement.type === 'ExpressionStatement' && statement.expression.type === 'AwaitExpression';
}

function isCallExpressionCalleeMemberExpression(statement: Node): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'MemberExpression' &&
    statement.expression.callee.object.type === 'Identifier' &&
    statement.expression.callee.object.name !== 'assert'
  );
}

function isCallExpressionCalleeIdentifier(statement: Node): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'Identifier' &&
    !EXCLUDED_IDENTIFIERS.includes(statement.expression.callee.name)
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

function isVariableDeclarationIdentifier(statement: Node): boolean {
  return (
    statement.type === 'VariableDeclaration' &&
    statement.declarations.length > 0 &&
    statement.declarations[0]?.id !== undefined &&
    statement.declarations[0].id.type === 'Identifier' &&
    statement.declarations[0].init !== undefined &&
    statement.declarations[0].init !== null &&
    statement.declarations[0].init.type === 'CallExpression' &&
    statement.declarations[0].init.callee.type === 'Identifier' &&
    !EXCLUDED_IDENTIFIERS.includes(statement.declarations[0].init.callee.name)
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
  },
  create(context) {
    return {
      Program(node) {
        const fileName = context.filename.split('src/')[1] ?? context.filename;
        if (isTestFile(fileName)) {
          return;
        }
        node.body.forEach((statement) => {
          if (
            isAwaitExpression(statement) ||
            isCallExpressionCalleeMemberExpression(statement) ||
            isCallExpressionCalleeIdentifier(statement) ||
            isVariableDeclarationAwaitExpression(statement) ||
            isVariableDeclarationIdentifier(statement) ||
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
