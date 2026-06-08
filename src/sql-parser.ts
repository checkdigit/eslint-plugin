// sql-parser.ts
// Minimal ESLint-compatible parser for plain .sql files.
// Produces a bare Program AST so rules can access the raw SQL via
// context.getSourceCode().getText(). No tokens or scope analysis.

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

interface SqlParseResult {
  ast: {
    type: 'Program';
    body: never[];
    sourceType: 'module';
    range: [number, number];
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
    tokens: never[];
    comments: never[];
  };
  services: Record<string, never>;
  scopeManager: null;
  visitorKeys: Record<string, string[]>;
}

export function parseForESLint(code: string): SqlParseResult {
  const lines = code.split('\n');
  return {
    ast: {
      type: 'Program',
      body: [],
      sourceType: 'module',
      range: [0, code.length],
      loc: {
        start: { line: 1, column: 0 },
        end: { line: lines.length, column: lines[lines.length - 1]?.length ?? 0 },
      },
      tokens: [],
      comments: [],
    },
    services: {},
    scopeManager: null,
    visitorKeys: { Program: [] },
  };
}
