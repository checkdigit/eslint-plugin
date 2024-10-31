// agent/agent-test-wiring.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_TOKEN_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { RuleFix, RuleFixer } from '@typescript-eslint/utils/ts-eslint';
import debug from 'debug';

import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'agent-test-wiring';
const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));
const log = debug('eslint-plugin:agent:agent-test-wiring');

const STATEMENT_FIXTURE_RESET = 'fixture.reset()';
const STATEMENT_FIXTURE_RESET_AWAITED = `await ${STATEMENT_FIXTURE_RESET};`;
const STATEMENT_AGENT_DECLARATION = 'let agent: Agent;';
const STATEMENT_AGENT_CREATION = 'agent = await createAgent();';
const STATEMENT_AGENT_REGISTER = 'agent.register(await fixturePlugin(fixture));';
const STATEMENT_AGENT_ENABLE = 'agent.enable();';
const STATEMENT_AGENT_DISPOSE = 'await agent[Symbol.asyncDispose]();';

const rule: ESLintUtils.RuleModule<'updateTestWiring' | 'unknownError'> = createRule({
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
    log('Processing file:', context.filename);
    const sourceCode = context.sourceCode;
    const importDeclarations = new Map<string, TSESTree.ImportDeclaration>();
    let isFixtureUsed = false;
    let beforeAll: TSESTree.CallExpression | undefined;
    let afterAll: TSESTree.CallExpression | undefined;

    return {
      ImportDeclaration(importDeclaration) {
        const moduleName = importDeclaration.source.value;
        importDeclarations.set(moduleName, importDeclaration);
        if (
          moduleName === '@checkdigit/fixture' &&
          importDeclaration.specifiers.some(
            (specifier) =>
              specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
              specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier &&
              specifier.imported.name === 'createFixture',
          )
        ) {
          isFixtureUsed = true;
        }
      },
      'CallExpression[callee.name="beforeAll"]': (callExpression: TSESTree.CallExpression) => {
        beforeAll = callExpression;
      },
      'CallExpression[callee.name="afterAll"]': (callExpression: TSESTree.CallExpression) => {
        afterAll = callExpression;
      },
      'Program:exit'(program) {
        if (!isFixtureUsed || beforeAll === undefined) {
          return;
        }

        try {
          let jestImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let agentImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let fixturePluginImportFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let agentDeclarationFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let beforeAllFixer: ((fixer: RuleFixer) => RuleFix) | undefined;
          let afterAllFixer: ((fixer: RuleFixer) => RuleFix) | undefined;

          const lastImportDeclaration = [...importDeclarations.values()].at(-1);
          assert.ok(lastImportDeclaration);

          // make sure that afterAll is imported from jest
          const jestImportDeclaration = importDeclarations.get('@jest/globals');
          if (
            jestImportDeclaration &&
            !jestImportDeclaration.specifiers.some(
              (specifier) =>
                specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
                specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier &&
                specifier.imported.name === 'afterAll',
            )
          ) {
            const firstImportSpecifier = jestImportDeclaration.specifiers[0];
            assert.ok(firstImportSpecifier);
            jestImportFixer = (fixer: RuleFixer) => fixer.insertTextBefore(firstImportSpecifier, 'afterAll, ');
          }

          // make sure that agent is imported
          const agentImportDeclaration = importDeclarations.get('@checkdigit/agent');
          if (!agentImportDeclaration) {
            agentImportFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(
                lastImportDeclaration,
                `\nimport createAgent, { type Agent } from '@checkdigit/agent';`,
              );
          }

          // make sure that fixture plugin is imported
          const pathLets = context.filename.split('/');
          const currentFileIndex = pathLets.length - 1;
          const pluginFolderIndex = pathLets.lastIndexOf('src') + 1;
          // it should be safe to assume that the test code is always at least one level deeper than the plugin folder
          const fixturePluginImportPath = `${'../'.repeat(currentFileIndex - pluginFolderIndex)}plugin/fixture.test`;
          if (!importDeclarations.get(fixturePluginImportPath)) {
            fixturePluginImportFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(lastImportDeclaration, `\nimport fixturePlugin from '${fixturePluginImportPath}';`);
          }

          // inject agent declaration and initialization to `beforeAll` block
          const beforeAllArgument = beforeAll.arguments[0];
          assert.ok(beforeAllArgument !== undefined);
          if (!sourceCode.getText(beforeAllArgument).includes(STATEMENT_AGENT_CREATION)) {
            if (
              beforeAllArgument.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
              beforeAllArgument.body.type === TSESTree.AST_NODE_TYPES.BlockStatement
            ) {
              const fixtureResetStatement = beforeAllArgument.body.body.find(
                (statement) => sourceCode.getText(statement) === STATEMENT_FIXTURE_RESET_AWAITED,
              );
              assert.ok(fixtureResetStatement !== undefined);
              beforeAllFixer = (fixer: RuleFixer) =>
                fixer.replaceText(
                  fixtureResetStatement,
                  [
                    STATEMENT_AGENT_CREATION,
                    STATEMENT_AGENT_REGISTER,
                    STATEMENT_AGENT_ENABLE,
                    STATEMENT_FIXTURE_RESET_AWAITED,
                  ].join('\n'),
                );
            } else {
              beforeAllFixer = (fixer: RuleFixer) =>
                fixer.replaceText(
                  beforeAllArgument,
                  [
                    `async () => {`,
                    STATEMENT_AGENT_CREATION,
                    STATEMENT_AGENT_REGISTER,
                    STATEMENT_AGENT_ENABLE,
                    STATEMENT_FIXTURE_RESET_AWAITED,
                    `}`,
                  ].join('\n'),
                );
            }
            agentDeclarationFixer = (fixer: RuleFixer) =>
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              fixer.insertTextBefore(beforeAll!, `${STATEMENT_AGENT_DECLARATION}\n`);
          }

          // inject agent disposal to `afterAll` block
          if (afterAll !== undefined) {
            const afterAllArrowFunctionExpression = afterAll.arguments[0];
            assert.ok(
              afterAllArrowFunctionExpression !== undefined &&
                afterAllArrowFunctionExpression.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
            );
            const arrowFunctionBody = afterAllArrowFunctionExpression.body;
            assert.ok(arrowFunctionBody.type === TSESTree.AST_NODE_TYPES.BlockStatement);

            const afterAllBodyText = sourceCode.getText(arrowFunctionBody);
            if (!afterAllBodyText.includes(STATEMENT_AGENT_DISPOSE)) {
              const lastStatement = arrowFunctionBody.body.at(-1);
              assert.ok(lastStatement);
              afterAllFixer = (fixer: RuleFixer) => fixer.insertTextAfter(lastStatement, STATEMENT_AGENT_DISPOSE);
            }
          } else {
            const nextToken = sourceCode.getTokenAfter(beforeAll);
            afterAllFixer = (fixer: RuleFixer) =>
              fixer.insertTextAfter(
                nextToken !== null && nextToken.type === AST_TOKEN_TYPES.Punctuator
                  ? nextToken
                  : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    beforeAll!,
                ['', `afterAll(async () => {`, STATEMENT_AGENT_DISPOSE, `});`].join('\n'),
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
              node: beforeAll,
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
