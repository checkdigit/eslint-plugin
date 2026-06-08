// athena/sql-file.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import debug from 'debug';
import { ESLintUtils } from '@typescript-eslint/utils';

import { parse } from '../peggy/athena-peggy.ts';
import type { AST } from './types';
import { createRootContext } from './context.ts';
import { ATHENA_ERROR, AthenaError, checkAthenaAst, offsetToLoc, SYNTEXT_ERROR } from './validate.ts';

export const ruleId = 'sql-file';

const log = debug('eslint-plugin:sql-file');
const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR | typeof ATHENA_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate plain .sql files against OpenAPI schemas at lint time',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
      [ATHENA_ERROR]: `AthenaError {{ errorMessage }}`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Program fires once per file; the entire source text is the SQL to validate.
      Program() {
        const sql = context.sourceCode.getText();

        if (!/^\s*(?:SELECT\b[\s\S]*\bFROM\b|WITH\b[\s\S]*\bSELECT\b[\s\S]*\b)/iu.test(sql)) {
          log('skipping non-SELECT SQL', { filename: context.filename });
          return;
        }

        let ast: AST;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ({ ast } = parse(sql, { includeLocations: true }));
        } catch (error) {
          log('error parsing SQL', { error, filename: context.filename });
          const pegLoc = (error as { location?: { start: { offset: number }; end: { offset: number } } }).location;
          if (pegLoc !== undefined) {
            // SQL offsets equal file offsets — no template-literal mapping needed.
            context.report({
              loc: {
                start: offsetToLoc(sql, pegLoc.start.offset),
                end: offsetToLoc(sql, pegLoc.end.offset),
              },
              messageId: SYNTEXT_ERROR,
              data: { errorMessage: (error as Error).message },
            });
          } else {
            context.report({
              loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
              messageId: SYNTEXT_ERROR,
              data: { errorMessage: (error as Error).message },
            });
          }
          return;
        }

        const athenaCtx = createRootContext();
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          checkAthenaAst(Array.isArray(ast) ? ast[0] : ast, athenaCtx);
        } catch (error) {
          log('error checking SQL AST', { error, filename: context.filename });
          if (error instanceof AthenaError) {
            const astLoc = (error.ast as { loc?: { start: { offset: number }; end: { offset: number } } } | undefined)
              ?.loc;
            if (astLoc !== undefined) {
              context.report({
                loc: {
                  start: offsetToLoc(sql, astLoc.start.offset),
                  end: offsetToLoc(sql, astLoc.end.offset),
                },
                messageId: ATHENA_ERROR,
                data: { errorMessage: error.message },
              });
            } else {
              context.report({
                loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
                messageId: ATHENA_ERROR,
                data: { errorMessage: error.message },
              });
            }
          } else {
            // eslint-disable-next-line no-console
            console.error(`Failed to apply ${ruleId} rule for "${context.filename}":`, error);
            context.report({
              loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
              messageId: ATHENA_ERROR,
              data: {
                errorMessage: error instanceof Error ? String(error) : JSON.stringify(error, undefined, 2),
              },
            });
          }
        }
      },
    };
  },
});

export default rule;
