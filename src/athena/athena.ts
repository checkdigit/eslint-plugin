// athena/athena.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import debug from 'debug';
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

import { parse } from '../peggy/athena-peggy.ts';
import type { AST } from './types';
import { createRootContext } from './context.ts';
import { ATHENA_ERROR, AthenaError, checkAthenaAst, offsetToLoc, SYNTEXT_ERROR } from './validate.ts';

export const ruleId = 'athena';

const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

// Maps a SQL-string offset (as produced by the PEG parser) back to an absolute source offset.
// Each quasi in a TemplateLiteral contributes a segment; template expressions have no SQL width
// but do occupy source characters, so a naïve single-offset approach gives wrong results when
// the error location is in a quasi that follows one or more template expressions.
interface SqlSourceSegment {
  sqlStart: number; // offset in the trimmed SQL where this quasi's content begins
  srcStart: number; // absolute source offset where this quasi's content begins
}

function buildSqlMapping(sqlNode: TSESTree.Node): SqlSourceSegment[] {
  if (sqlNode.type !== AST_NODE_TYPES.TemplateLiteral) {
    // String literals: single segment, content starts one char after the opening quote.
    return [{ sqlStart: 0, srcStart: sqlNode.range[0] + 1 }];
  }
  const rawSql = sqlNode.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
  const trimStart = rawSql.length - rawSql.trimStart().length;
  const segments: SqlSourceSegment[] = [];
  let sqlCursor = 0;
  for (const [index, quasi] of sqlNode.quasis.entries()) {
    const cooked = quasi.value.cooked ?? '';
    const localTrim = index === 0 ? trimStart : 0;
    // quasi.range[0] is the opening backtick (index 0) or the closing } of the preceding expression.
    segments.push({ sqlStart: sqlCursor, srcStart: quasi.range[0] + 1 + localTrim });
    sqlCursor += cooked.length - localTrim;
  }
  return segments;
}

function sqlOffsetToSource(sqlOffset: number, segments: SqlSourceSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index--) {
    const seg = segments[index];
    if (seg !== undefined && sqlOffset >= seg.sqlStart) {
      return seg.srcStart + (sqlOffset - seg.sqlStart);
    }
  }
  return segments[0]?.srcStart ?? 0;
}

// ---------------------------------------------------------------------------
// ESLint rule
// ---------------------------------------------------------------------------

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR | typeof ATHENA_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Athena SQL strings against OpenAPI schemas at lint time',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
      [ATHENA_ERROR]: `AthenaError {{ errorMessage }}`,
    },
  },
  defaultOptions: [],
  create(context) {
    function checkSql(sql: string, sqlNode: TSESTree.Node) {
      if (!/^\s*(?:SELECT\b[\s\S]*\bFROM\b|WITH\b[\s\S]*\bSELECT\b[\s\S]*\b)/iu.test(sql)) {
        log('skipping non-SELECT SQL string', { sql });
        return;
      }

      const sqlMapping = buildSqlMapping(sqlNode);
      let ast: AST;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ({ ast } = parse(sql, { includeLocations: true }));
      } catch (error) {
        log('error parsing Athena SQL', { error, sql });
        const pegLoc = (error as { location?: { start: { offset: number }; end: { offset: number } } }).location;
        if (pegLoc !== undefined) {
          const sourceText = context.sourceCode.getText();
          context.report({
            loc: {
              start: offsetToLoc(sourceText, sqlOffsetToSource(pegLoc.start.offset, sqlMapping)),
              end: offsetToLoc(sourceText, sqlOffsetToSource(pegLoc.end.offset, sqlMapping)),
            },
            messageId: SYNTEXT_ERROR,
            data: { errorMessage: (error as Error).message },
          });
        } else {
          context.report({
            node: sqlNode,
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
        log('error checking Athena AST', { error, sql });
        if (error instanceof AthenaError) {
          const astLoc = (error.ast as { loc?: { start: { offset: number }; end: { offset: number } } } | undefined)
            ?.loc;
          if (astLoc !== undefined) {
            const sourceText = context.sourceCode.getText();
            context.report({
              loc: {
                start: offsetToLoc(sourceText, sqlOffsetToSource(astLoc.start.offset, sqlMapping)),
                end: offsetToLoc(sourceText, sqlOffsetToSource(astLoc.end.offset, sqlMapping)),
              },
              messageId: ATHENA_ERROR,
              data: { errorMessage: error.message },
            });
          } else {
            context.report({
              node: sqlNode,
              messageId: ATHENA_ERROR,
              data: { errorMessage: error.message },
            });
          }
        } else {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for "${context.filename}":`, error);
          context.report({
            node: sqlNode,
            messageId: ATHENA_ERROR,
            data: {
              errorMessage: error instanceof Error ? String(error) : JSON.stringify(error, undefined, 2),
            },
          });
        }
      }
    }

    return {
      TemplateLiteral(sqlNode) {
        const sql = sqlNode.quasis
          .map((quasi) => quasi.value.cooked)
          .join('')
          .trim();
        checkSql(sql, sqlNode);
      },
      Literal(sqlNode) {
        if (typeof sqlNode.value !== 'string') {
          return;
        }
        checkSql(sqlNode.value, sqlNode);
      },
    };
  },
});

export default rule;
