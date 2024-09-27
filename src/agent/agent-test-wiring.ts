// agent/agent-test-wiring.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_TOKEN_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { RuleFix, RuleFixer } from '@typescript-eslint/utils/ts-eslint';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'agent-test-wiring';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Update test wiring.',
    },
    messages: {
      updateTestWiring: 'Updating test wiring.',
      unknownError: 'Unknown error occurred in file "{{fileName}}": {{ error }}.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const importDeclarations = new Map<string, TSESTree.ImportDeclaration>();
    let beforeAllCallExpression: TSESTree.CallExpression | undefined;
    let afterAllCallExpression: TSESTree.CallExpression | undefined;

    return {
      ImportDeclaration(importDeclaration) {
        const moduleName = importDeclaration.source.value;
        importDeclarations.set(moduleName, importDeclaration);
      },
      'CallExpression[callee.name="beforeAll"]': (callExpression: TSESTree.CallExpression) => {
        beforeAllCallExpression = callExpression;
      },
      'CallExpression[callee.name="afterAll"]': (callExpression: TSESTree.CallExpression) => {
        afterAllCallExpression = callExpression;
      },
      'Program:exit'(program) {
        try {
          let jestImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let agentImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let fixturePluginImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let agentDeclarationFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let beforeAllFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let afterAllFixer: ((fixer: RuleFixer) => RuleFix) | undefined;

          const lastImportDeclaration = [...importDeclarations.values()].at(-1);
          assert.ok(lastImportDeclaration);

          const jestImportDeclaration = importDeclarations.get('@jest/globals');
          if (
            jestImportDeclaration &&
            !jestImportDeclaration.specifiers.some(
              (specifier) =>
                specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && specifier.imported.name === 'afterAll',
            )
          ) {
            const firstImportSpecifier = jestImportDeclaration.specifiers[0];
            assert.ok(firstImportSpecifier);
            jestImportFixer = (fixer: RuleFixer) => fixer.insertTextBefore(firstImportSpecifier, 'afterAll, ');
          }

          const agentImportDeclaration = importDeclarations.get('@checkdigit/agent');
          if (!agentImportDeclaration) {
            agentImportFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(
                lastImportDeclaration,
                `\nimport createAgent, { type Agent } from '@checkdigit/agent';`,
              );
          }

          const fixturePluginImportDeclaration = importDeclarations.get('../../plugin/fixture.test');
          if (!fixturePluginImportDeclaration) {
            fixturePluginImportFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(lastImportDeclaration, `\nimport fixturePlugin from '../../plugin/fixture.test';`);
          }

          if (beforeAllCallExpression !== undefined) {
            const beforeAllArrowFunctionExpression = beforeAllCallExpression.arguments[0];
            assert.ok(
              beforeAllArrowFunctionExpression !== undefined &&
                beforeAllArrowFunctionExpression.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
            );
            const arrowFunctionBody = beforeAllArrowFunctionExpression.body;
            assert.ok(arrowFunctionBody.type === TSESTree.AST_NODE_TYPES.BlockStatement);

            const targetStatement = arrowFunctionBody.body.find(
              (statement) => sourceCode.getText(statement) /*?*/ === 'await fixture.reset();',
            );
            if (targetStatement !== undefined) {
              const beforeAllBodyText = sourceCode.getText(arrowFunctionBody);
              if (!beforeAllBodyText.includes('agent = await createAgent();')) {
                beforeAllFixer = (fixer: RuleFixer) =>
                  fixer.replaceText(
                    targetStatement,
                    [
                      'agent = await createAgent();',
                      'agent.register(await fixturePlugin(fixture));',
                      'agent.enable();',
                      'await fixture.reset();',
                    ].join('\n'),
                  );
              }
              if (!beforeAllBodyText.includes('let agent: Agent;')) {
                agentDeclarationFixer = (fixer: RuleFixer) =>
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  fixer.insertTextBefore(beforeAllCallExpression!, 'let agent: Agent;\n');
              }
            }
          }

          if (afterAllCallExpression !== undefined) {
            const afterAllArrowFunctionExpression = afterAllCallExpression.arguments[0];
            assert.ok(
              afterAllArrowFunctionExpression !== undefined &&
                afterAllArrowFunctionExpression.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
            );
            const arrowFunctionBody = afterAllArrowFunctionExpression.body;
            assert.ok(arrowFunctionBody.type === TSESTree.AST_NODE_TYPES.BlockStatement);

            const afterAllBodyText = sourceCode.getText(arrowFunctionBody);
            if (!afterAllBodyText.includes('await agent[Symbol.asyncDispose]();')) {
              const lastStatement = arrowFunctionBody.body.at(-1);
              assert.ok(lastStatement);
              afterAllFixer = (fixer: RuleFixer) =>
                fixer.insertTextAfter(lastStatement, 'await agent[Symbol.asyncDispose]();');
            }
          } else if (beforeAllCallExpression !== undefined) {
            const nextToken = sourceCode.getTokenAfter(beforeAllCallExpression);
            afterAllFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(
                nextToken !== null && nextToken.type === AST_TOKEN_TYPES.Punctuator
                  ? nextToken
                  : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    beforeAllCallExpression!,
                `\nafterAll(async () => {
  await agent[Symbol.asyncDispose]();
});`,
              );
          }

          if (
            jestImportFixer !== undefined ||
            agentImportFixer !== undefined ||
            fixturePluginImportFixer !== undefined ||
            agentDeclarationFixer !== undefined ||
            beforeAllFixer !== undefined ||
            afterAllFixer !== undefined
          ) {
            context.report({
              messageId: 'updateTestWiring',
              node: program,
              *fix(fixer) {
                if (jestImportFixer !== undefined) {
                  yield jestImportFixer(fixer);
                }
                if (agentImportFixer !== undefined) {
                  yield agentImportFixer(fixer);
                }
                if (fixturePluginImportFixer !== undefined) {
                  yield fixturePluginImportFixer(fixer);
                }
                if (agentDeclarationFixer !== undefined) {
                  yield agentDeclarationFixer(fixer);
                }
                if (beforeAllFixer !== undefined) {
                  yield beforeAllFixer(fixer);
                }
                if (afterAllFixer !== undefined) {
                  yield afterAllFixer(fixer);
                }
              },
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: program,
            messageId: 'unknownError',
            data: {
              fileName: context.filename,
              error: error instanceof Error ? error.toString() : JSON.stringify(error),
            },
          });
        }
      },
    };
  },
});

export default rule;
