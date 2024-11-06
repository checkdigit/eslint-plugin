// agent/fetch-response-body-json.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { getAncestor } from '../library/ts-tree';

export const ruleId = 'fetch-response-body-json';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

interface Change {
  enclosingFunction: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration;
  enclosingStatement: TSESTree.VariableDeclaration | TSESTree.ExpressionStatement | TSESTree.ReturnStatement;
  enclosingStatementIndex: number;
  responseBodyNode: TSESTree.MemberExpression;
  responseVariableName: string;
  responseBodyVariableName: string;
  isResponseBodyVariableDeclared: boolean;
  // replacementText: string;
}

const rule: ESLintUtils.RuleModule<'unknownError' | 'replaceBodyWithJson'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Replace "response.body" with "await response.json()".',
    },
    messages: {
      replaceBodyWithJson: 'Replace "response.body" with "await response.json()".',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();
    const allChanges = new Map<TSESTree.Node, Map<string, Change[]>>();

    return {
      'MemberExpression[property.name="body"]': (responseBodyNode: TSESTree.MemberExpression) => {
        try {
          const responseNode = parserServices.esTreeNodeToTSNodeMap.get(responseBodyNode.object);
          const responseType = typeChecker.getTypeAtLocation(responseNode);

          const shouldReplace =
            responseType.getProperties().some((symbol) => symbol.name === 'body') &&
            responseType.getProperties().some((symbol) => symbol.name === 'json');

          if (shouldReplace) {
            const enclosingFunction = getAncestor(
              responseBodyNode,
              (node: TSESTree.Node) =>
                node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                node.type === AST_NODE_TYPES.FunctionExpression ||
                node.type === AST_NODE_TYPES.FunctionDeclaration,
            ) as TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration;
            const enclosingStatement = getAncestor(
              responseBodyNode,
              (node: TSESTree.Node) =>
                (node.type === AST_NODE_TYPES.VariableDeclaration ||
                  node.type === AST_NODE_TYPES.ExpressionStatement ||
                  node.type === AST_NODE_TYPES.ReturnStatement) &&
                node.parent.type === AST_NODE_TYPES.BlockStatement,
            ) as TSESTree.VariableDeclaration | TSESTree.ExpressionStatement | TSESTree.ReturnStatement;
            const enclosingStatementIndex = (enclosingFunction.body as TSESTree.BlockStatement).body.indexOf(
              enclosingStatement,
            );
            const responseVariableName = (responseBodyNode.object as TSESTree.Identifier).name;
            const isResponseBodyVariableDeclared =
              enclosingStatement.type === AST_NODE_TYPES.VariableDeclaration &&
              enclosingStatement.declarations.some((declaration) => declaration.init === responseBodyNode);
            const responseBodyVariableName = isResponseBodyVariableDeclared
              ? (enclosingStatement.declarations.find((declaration) => declaration.init === responseBodyNode)
                  ?.id as unknown as string)
              : `${(responseBodyNode.object as TSESTree.Identifier).name}Body`;

            const change: Change = {
              enclosingFunction,
              enclosingStatement,
              enclosingStatementIndex,
              responseVariableName,
              responseBodyNode,
              responseBodyVariableName,
              isResponseBodyVariableDeclared,
            };

            const changesByFunction = allChanges.get(enclosingFunction) ?? new Map<string, Change[]>();
            const changesByResponse = changesByFunction.get(responseVariableName) ?? [];
            changesByResponse.push(change);
            changesByFunction.set(responseVariableName, changesByResponse);
            allChanges.set(enclosingFunction, changesByFunction);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: responseBodyNode,
            messageId: 'unknownError',
            data: {
              fileName: context.filename,
              error: error instanceof Error ? error.toString() : JSON.stringify(error),
            },
          });
        }
      },

      'Program:exit': () => {
        if (allChanges.size === 0) {
          return;
        }

        const fixes: { node: TSESTree.Node; text: string; insert: boolean }[] = [];
        for (const changesByFunction of allChanges.values()) {
          for (const changesByResponse of changesByFunction.values()) {
            const orderedChanges = changesByResponse.sort(
              (changeA, changeB) => changeA.enclosingStatementIndex - changeB.enclosingStatementIndex,
            );
            const firstChange = orderedChanges[0];
            assert(firstChange);

            const {
              responseBodyNode,
              responseVariableName,
              responseBodyVariableName,
              isResponseBodyVariableDeclared,
              enclosingStatement,
            } = firstChange;

            let remainingChanges;
            if (!isResponseBodyVariableDeclared) {
              fixes.push({
                node: enclosingStatement,
                text: `const ${responseBodyVariableName} = await ${responseVariableName}.json();\n`,
                insert: true,
              });
              remainingChanges = orderedChanges;
            } else {
              fixes.push({
                node: responseBodyNode,
                text: `await ${responseVariableName}.json()`,
                insert: false,
              });
              remainingChanges = orderedChanges.slice(1);
            }

            for (const change of remainingChanges) {
              fixes.push({ node: change.responseBodyNode, text: responseBodyVariableName, insert: false });
            }
          }
        }

        for (const fix of fixes) {
          context.report({
            node: fix.node,
            messageId: 'replaceBodyWithJson',
            fix(fixer) {
              return fix.insert ? fixer.insertTextBefore(fix.node, fix.text) : fixer.replaceText(fix.node, fix.text);
            },
          });
        }
      },
    };
  },
});

export default rule;
