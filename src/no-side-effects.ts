// no-side-effects.ts

/*
 * Copyright (c) 2022-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import getDocumentationUrl from './get-documentation-url.ts';

interface RuleOptions {
  excludedIdentifiers: string[];
}

export const ruleId = 'no-side-effects';
const NO_SIDE_EFFECTS = 'NO_SIDE_EFFECTS';

// Type guards

// Checks if a node is an ExpressionStatement
const isExpressionStatement = (node: TSESTree.Node): node is TSESTree.ExpressionStatement =>
  node.type === TSESTree.AST_NODE_TYPES.ExpressionStatement;

// Checks if a statement is an AwaitExpression
const isAwaitExpression = (statement: TSESTree.Node): boolean =>
  isExpressionStatement(statement) && statement.expression.type === TSESTree.AST_NODE_TYPES.AwaitExpression;

// Checks if a node is a VariableDeclaration with an AwaitExpression
const isVariableDeclarationAwaitExpression = (node: TSESTree.Node): boolean =>
  node.type === TSESTree.AST_NODE_TYPES.VariableDeclaration &&
  node.declarations.length > 0 &&
  node.declarations[0].init?.type === TSESTree.AST_NODE_TYPES.AwaitExpression;

// Checks if a node is a VariableDeclaration that is not const or using
const isNotValidVariableDeclaration = (node: TSESTree.Node): boolean =>
  node.type === TSESTree.AST_NODE_TYPES.VariableDeclaration && node.kind !== 'const' && node.kind !== 'using';

// Checks if a node is a control flow statement
const isControlFlowStatement = (node: TSESTree.Node): boolean =>
  [
    TSESTree.AST_NODE_TYPES.TryStatement,
    TSESTree.AST_NODE_TYPES.IfStatement,
    TSESTree.AST_NODE_TYPES.SwitchStatement,
    TSESTree.AST_NODE_TYPES.ForStatement,
    TSESTree.AST_NODE_TYPES.WhileStatement,
    TSESTree.AST_NODE_TYPES.DoWhileStatement,
  ].includes(node.type);

// Checks if a node is an AssignmentExpression
const isAssignmentExpression = (node: TSESTree.Node): boolean =>
  node.type === TSESTree.AST_NODE_TYPES.ExpressionStatement &&
  node.expression.type === TSESTree.AST_NODE_TYPES.AssignmentExpression;

// Helper functions

// Checks if the callee is an identifier and not excluded
const isIdentifierCallee = (node: TSESTree.CallExpression, excludedIdentifiers: string[]): boolean =>
  node.callee.type === TSESTree.AST_NODE_TYPES.Identifier && !excludedIdentifiers.includes(node.callee.name);

// Checks if the callee is a member expression and not excluded
const isMemberExpressionCallee = (node: TSESTree.CallExpression, excludedIdentifiers: string[]): boolean =>
  node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
  node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
  node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
  !excludedIdentifiers.includes(`${node.callee.object.name}.${node.callee.property.name}`);

// Checks if the callee is a member expression with a non-identifier object
const isNonIdentifierObjectMemberExpressionCallee = (node: TSESTree.CallExpression): boolean =>
  node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
  node.callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier;

// Checks if a statement is a CallExpression with a member expression callee
const isCallExpressionCalleeMemberExpression = (statement: TSESTree.Node, excludedIdentifiers: string[]): boolean =>
  isExpressionStatement(statement) &&
  statement.expression.type === TSESTree.AST_NODE_TYPES.CallExpression &&
  statement.expression.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
  statement.expression.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
  statement.expression.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
  !excludedIdentifiers.includes(statement.expression.callee.object.name) &&
  !excludedIdentifiers.includes(
    `${statement.expression.callee.object.name}.${statement.expression.callee.property.name}`,
  );

// Checks if a node is a VariableDeclaration with a CallExpression
const isVariableDeclarationCallExpression = (node: TSESTree.Node, excludedIdentifiers: string[]): boolean => {
  if (node.type !== TSESTree.AST_NODE_TYPES.VariableDeclaration || node.declarations.length === 0) {
    return false;
  }

  const init = node.declarations[0].init;
  if (init?.type !== TSESTree.AST_NODE_TYPES.CallExpression) {
    return false;
  }

  const callee = init.callee;
  if (
    callee.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
    callee.type === TSESTree.AST_NODE_TYPES.FunctionExpression
  ) {
    return true;
  }

  return (
    isIdentifierCallee(init, excludedIdentifiers) ||
    isMemberExpressionCallee(init, excludedIdentifiers) ||
    isNonIdentifierObjectMemberExpressionCallee(init)
  );
};

// Checks if an ExportNamedDeclaration has side effects
const isExportNamedDeclarationWithSideEffects = (statement: TSESTree.Node, excludedIdentifiers: string[]): boolean =>
  statement.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration &&
  statement.declaration !== null &&
  (isVariableDeclarationAwaitExpression(statement.declaration) ||
    isVariableDeclarationCallExpression(statement.declaration, excludedIdentifiers));

// Checks if an ExpressionStatement has side effects
const isExpressionStatementWithSideEffects = (statement: TSESTree.Node, excludedIdentifiers: string[]): boolean =>
  statement.type === TSESTree.AST_NODE_TYPES.ExpressionStatement &&
  statement.expression.type === TSESTree.AST_NODE_TYPES.CallExpression &&
  ((statement.expression.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
    !excludedIdentifiers.includes(statement.expression.callee.name)) ||
    (statement.expression.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
      statement.expression.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
      statement.expression.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
      !excludedIdentifiers.includes(
        `${statement.expression.callee.object.name}.${statement.expression.callee.property.name}`,
      )));

// Checks if a node is a VariableDeclaration with a NewExpression
const isVariableDeclarationNewExpression = (node: TSESTree.Node): boolean => {
  if (node.type !== TSESTree.AST_NODE_TYPES.VariableDeclaration || node.declarations.length === 0) {
    return false;
  }

  const init = node.declarations[0].init;
  return init?.type === TSESTree.AST_NODE_TYPES.NewExpression;
};

// Update the hasSideEffects function to return a string indicating the type of side effect
const hasSideEffects = (statement: TSESTree.Node, excludedIdentifiers: string[]): string | null => {
  if (isAwaitExpression(statement)) {
    return TSESTree.AST_NODE_TYPES.AwaitExpression;
  }
  if (isCallExpressionCalleeMemberExpression(statement, excludedIdentifiers)) {
    return 'CallExpressionCalleeMemberExpression';
  }
  if (isVariableDeclarationAwaitExpression(statement)) {
    return 'VariableDeclarationAwaitExpression';
  }
  if (isVariableDeclarationCallExpression(statement, excludedIdentifiers)) {
    return 'VariableDeclarationCallExpression';
  }
  if (isVariableDeclarationNewExpression(statement)) {
    return 'VariableDeclarationNewExpression';
  }
  if (isExportNamedDeclarationWithSideEffects(statement, excludedIdentifiers)) {
    return 'ExportNamedDeclarationWithSideEffects';
  }
  if (isExpressionStatementWithSideEffects(statement, excludedIdentifiers)) {
    return 'ExpressionStatementWithSideEffects';
  }
  if (isControlFlowStatement(statement)) {
    return 'ControlFlowStatement';
  }
  if (isNotValidVariableDeclaration(statement)) {
    return 'NotValidVariableDeclaration';
  }
  if (isAssignmentExpression(statement)) {
    return TSESTree.AST_NODE_TYPES.AssignmentExpression;
  }
  return null;
};

const createRule: ReturnType<typeof ESLintUtils.RuleCreator> = ESLintUtils.RuleCreator((name) =>
  getDocumentationUrl(name),
);

const rule: ReturnType<typeof createRule> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure no side effects can occur at the module-level only if exporting module',
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
          const sideEffectType = hasSideEffects(statement, excludedIdentifiers);
          if (sideEffectType !== null) {
            context.report({
              node: statement,
              messageId: NO_SIDE_EFFECTS,
              data: {
                sideEffectType,
              },
            });
          }
        });
      },
    };
  },
});

export default rule;
