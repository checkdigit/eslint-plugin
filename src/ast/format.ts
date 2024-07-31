// format.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { Node } from 'estree';
import type { SourceCode } from 'eslint';
import { strict as assert } from 'node:assert';

export function getIndentation(node: Node | TSESTree.Node, sourceCode: SourceCode | TSESLint.SourceCode) {
  assert.ok(node.loc);
  const line = sourceCode.lines[node.loc.start.line - 1];
  assert.ok(line !== undefined);
  const indentMatch = line.match(/^\s*/u);
  return indentMatch ? indentMatch[0] : '';
}
