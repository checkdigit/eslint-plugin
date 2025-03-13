// no-side-effects.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
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
    statement.expression.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
    !excludedIdentifiers.includes(statement.expression.callee.object.name) &&
    !excludedIdentifiers.includes(
      `${statement.expression.callee.object.name}.${statement.expression.callee.property.name}`,
    )
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

// Helper function to check if the callee is an identifier and not excluded
function isIdentifierCallee(node: TSESTree.CallExpression, excludedIdentifiers: string[]): boolean {
  return node.callee.type === TSESTree.AST_NODE_TYPES.Identifier && !excludedIdentifiers.includes(node.callee.name);
}

// Helper function to check if the callee is a member expression and not excluded
function isMemberExpressionCallee(node: TSESTree.CallExpression, excludedIdentifiers: string[]): boolean {
  return (
    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
    !excludedIdentifiers.includes(`${node.callee.object.name}.${node.callee.property.name}`)
  );
}

// Helper function to check if the callee is a member expression with a non-identifier object
function isNonIdentifierObjectMemberExpressionCallee(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier
  );
}

// To check if it is a variable declaration with a call expression i.e const configuration = new Class(); or Member Expressions i.e const server = http.createServer();
function isVariableDeclarationCallExpression(node: TSESTree.Node, excludedIdentifiers: string[]): boolean {
  if (node.type !== TSESTree.AST_NODE_TYPES.VariableDeclaration || node.declarations.length === 0) {
    return false;
  }

  const init = node.declarations[0]?.init;
  if (init?.type !== TSESTree.AST_NODE_TYPES.CallExpression) {
    return false;
  }

  return (
    isIdentifierCallee(init, excludedIdentifiers) ||
    isMemberExpressionCallee(init, excludedIdentifiers) ||
    isNonIdentifierObjectMemberExpressionCallee(init)
  );
}

// Helper function to check if a given AST node (statement) has any side effects that should be reported
function hasSideEffects(statement: TSESTree.Node, excludedIdentifiers: string[]): boolean {
  return (
    isAwaitExpression(statement) ||
    isCallExpressionCalleeMemberExpression(statement, excludedIdentifiers) ||
    isVariableDeclarationAwaitExpression(statement) ||
    isVariableDeclarationCallExpression(statement, excludedIdentifiers) ||
    (statement.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration &&
      statement.declaration !== null &&
      (isVariableDeclarationAwaitExpression(statement.declaration) ||
        isVariableDeclarationCallExpression(statement.declaration, excludedIdentifiers)))
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
        const hasExport = node.body.some(
          (statement: TSESTree.Node) =>
            statement.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration ||
            statement.type === TSESTree.AST_NODE_TYPES.ExportDefaultDeclaration ||
            statement.type === TSESTree.AST_NODE_TYPES.ExportAllDeclaration,
        );

        if (!hasExport) {
          return;
        }

        node.body.forEach((statement: TSESTree.Node) => {
          if (hasSideEffects(statement, excludedIdentifiers)) {
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
