// no-side-effects.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/typescript-estree';

interface RuleOptions {
  excludedIdentifiers: string[];
}

export const ruleId = 'no-side-effects';
const NO_SIDE_EFFECTS = 'NO_SIDE_EFFECTS';

// Type guard to check if a node is an ExpressionStatement
function isExpressionStatement(node: TSESTree.Node): node is TSESTree.ExpressionStatement {
  return node.type === TSESTree.AST_NODE_TYPES.ExpressionStatement;
}

// Type guard to check if a node is an AwaitExpression
function isAwaitExpression(statement: TSESTree.Node): boolean {
  return isExpressionStatement(statement) && statement.expression.type === TSESTree.AST_NODE_TYPES.AwaitExpression;
}

// To check if it is a call expression with a member expression i.e. module.method()
function isCallExpressionCalleeMemberExpression(statement: TSESTree.Node, excludedIdentifiers: string[]): boolean {
  return (
    isExpressionStatement(statement) &&
    statement.expression.type === TSESTree.AST_NODE_TYPES.CallExpression &&
    statement.expression.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
    statement.expression.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
    !excludedIdentifiers.includes(statement.expression.callee.object.name)
  );
}

// To check if it is a variable declaration with an await expression i.e. const configuration = await someFunction();
function isVariableDeclarationAwaitExpression(node: TSESTree.Node): boolean {
  return (
    node.type === TSESTree.AST_NODE_TYPES.VariableDeclaration &&
    node.declarations.length > 0 &&
    node.declarations[0]?.init?.type === TSESTree.AST_NODE_TYPES.AwaitExpression
  );
}

// To check if it is a variable declaration with a call expression
function isVariableDeclarationCallExpression(node: TSESTree.Node, excludedIdentifiers: string[]): boolean {
  return (
    node.type === TSESTree.AST_NODE_TYPES.VariableDeclaration &&
    node.declarations.length > 0 &&
    node.declarations[0]?.init?.type === TSESTree.AST_NODE_TYPES.CallExpression &&
    ((node.declarations[0].init.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
      !excludedIdentifiers.includes(node.declarations[0].init.callee.name)) ||
      node.declarations[0].init.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression)
  );
}

const createRule: ReturnType<typeof ESLintUtils.RuleCreator> = ESLintUtils.RuleCreator((name) => name);

const rule: ReturnType<typeof createRule> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure no side effects can occur at the module-level',
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
    messages: {
      [NO_SIDE_EFFECTS]: 'No side effects can occur at the module-level',
    },
  },
  defaultOptions: [{ excludedIdentifiers: [''] }],
  create(context) {
    const options: RuleOptions = context.options[0] as RuleOptions;
    const excludedIdentifiers = options.excludedIdentifiers.length > 0 ? options.excludedIdentifiers : [];

    return {
      Program(node: TSESTree.Program) {
        node.body.forEach((statement) => {
          if (
            isAwaitExpression(statement) ||
            isCallExpressionCalleeMemberExpression(statement, excludedIdentifiers) ||
            isVariableDeclarationAwaitExpression(statement) ||
            isVariableDeclarationCallExpression(statement, excludedIdentifiers)
          ) {
            context.report({
              node: statement,
              messageId: NO_SIDE_EFFECTS,
            });
          }
        });
      },
    };
  },
});

export default rule;
