// athena/zzz.spec.ts — unit tests for the walk() visitor dispatcher

import { describe, expect, it } from '@jest/globals';

import {
  extractBracketAccessorPath,
  extractColumnRefs,
  extractJsonExtractPath,
  hasFunctionCalls,
  type VisitorMap,
  walk,
} from './visitor.ts';

describe('visitor walk()', () => {
  const simpleSelect = {
    type: 'select',
    with: null,
    distinct: null,
    options: null,
    columns: [
      {
        type: 'expr',
        expr: { type: 'column_ref', table: null, column: 'url', collate: null },
        as: null,
      },
    ],
    from: [{ db: null, table: 'link', as: null }],
    where: null,
    groupby: null,
    having: null,
    orderby: null,
    limit: null,
  };

  it('calls visitSelect for a select node', () => {
    const visited: string[] = [];
    walk(simpleSelect, {
      visitSelect() {
        visited.push('select');
      },
    });
    expect(visited).toEqual(['select']);
  });

  it('calls visitBaseFrom for a plain table', () => {
    const names: string[] = [];
    walk(simpleSelect, {
      visitBaseFrom(node) {
        names.push(node.table);
      },
    });
    expect(names).toEqual(['link']);
  });

  it('calls visitColumnRef for column references in SELECT list', () => {
    const cols: string[] = [];
    walk(simpleSelect, {
      visitColumnRef(node) {
        cols.push(typeof node.column === 'string' ? node.column : '?');
      },
    });
    expect(cols).toEqual(['url']);
  });

  it('does not call visitSelect for non-select nodes', () => {
    const visited: unknown[] = [];
    const visitor: VisitorMap = {
      visitSelect() {
        visited.push(1);
      },
    };
    walk({ type: 'binary_expr', operator: '=', left: null, right: null }, visitor);
    expect(visited).toHaveLength(0);
  });
});

describe('visitor extractors', () => {
  const colRefExpr = {
    type: 'expr',
    expr: { type: 'column_ref', table: 'l', column: 'responseheaders', collate: null },
    as: 'x',
  };

  const jsonExtractExpr = {
    type: 'expr',
    expr: {
      type: 'function',
      name: { name: [{ type: 'default', value: 'json_extract_scalar' }] },
      args: {
        type: 'expr_list',
        value: [
          { type: 'column_ref', table: null, column: 'responsebody', collate: null },
          { type: 'single_quote_string', value: '$.name' },
        ],
      },
    },
    as: 'bodyName',
  };

  it('extractColumnRefs finds a column_ref inside an expr wrapper', () => {
    const refs = extractColumnRefs(colRefExpr);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.column).toBe('responseheaders');
  });

  it('extractColumnRefs finds column refs inside a function call', () => {
    const refs = extractColumnRefs(jsonExtractExpr);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.column).toBe('responsebody');
  });

  it('extractJsonExtractPath returns the path argument', () => {
    expect(extractJsonExtractPath(jsonExtractExpr)).toBe('$.name');
  });

  it('extractJsonExtractPath returns undefined when no json_extract call present', () => {
    expect(extractJsonExtractPath(colRefExpr)).toBeUndefined();
  });

  it('extractBracketAccessorPath returns the JSONPath for bracket access', () => {
    const bracketExpr = {
      type: 'expr',
      expr: {
        type: 'column_ref',
        table: null,
        column: 'posting',
        collate: null,
        // eslint-disable-next-line camelcase
        array_index: [{ brackets: true, index: { type: 'string', value: 'accountId' } }],
      },
      as: null,
    };
    expect(extractBracketAccessorPath(bracketExpr)).toBe('$["accountId"]');
  });

  it('hasFunctionCalls returns true when a function is present', () => {
    expect(hasFunctionCalls(jsonExtractExpr)).toBe(true);
  });

  it('hasFunctionCalls returns false for a plain column ref', () => {
    expect(hasFunctionCalls(colRefExpr)).toBe(false);
  });
});
