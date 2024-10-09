// no-wallaby-comment.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule, SourceCode } from 'eslint';
import type { Comment } from 'estree';

const wallabyRegex = /(?<=(?:^|\*\/)\s*)[?]{1,2}|file\.only|file\.skip/gu;
const commentRegex = /\s*(?:\/\/|<!--)\s*(?<comment>\?{1,2}\.?\s*|file\.(?:only|skip))\s*/gu;
function removeWallabyComment(context: Rule.RuleContext, sourceCode: SourceCode, start: number, end: number): void {
  context.report({
    loc: {
      start: sourceCode.getLocFromIndex(start),
      end: sourceCode.getLocFromIndex(end),
    },
    message: 'Remove wallaby-specific comments',
    fix: (fixer) => fixer.removeRange([start, end]),
  });
}

function processLineComment(context: Rule.RuleContext, sourceCode: SourceCode, comment: Comment): void {
  if (comment.loc) {
    const line = sourceCode.getLines()[comment.loc.start.line - 1];
    if (line !== undefined) {
      let match;
      while ((match = commentRegex.exec(line)) !== null) {
        const start = sourceCode.getIndexFromLoc({ line: comment.loc.start.line, column: match.index });
        const end = sourceCode.getIndexFromLoc({ line: comment.loc.start.line, column: comment.loc.end.column });
        removeWallabyComment(context, sourceCode, start, end);
      }
    }
  }
}

function processBlockComment(context: Rule.RuleContext, sourceCode: SourceCode, comment: Comment): void {
  const commentValues = comment.value.split('\n');
  const blockCommentRegex = /^(?:\s*\*\s*)?(?:file\.only|file\.skip)$/gu;
  commentValues.forEach((commentValue) => {
    let startLine = comment.loc?.start.line ?? 0;
    const endLine = comment.loc?.end.line ?? 0;
    let match;
    while (comment.loc && (match = wallabyRegex.exec(commentValue)) !== null) {
      const removeEntireComment = blockCommentRegex.test(comment.value.trim());
      if (removeEntireComment) {
        const start = sourceCode.getIndexFromLoc({ line: comment.loc.start.line, column: comment.loc.start.column });
        const end = sourceCode.getIndexFromLoc({ line: comment.loc.end.line, column: comment.loc.end.column });
        removeWallabyComment(context, sourceCode, start, end);
      } else {
        let lineNumber = 0;
        while (startLine <= endLine) {
          const line = sourceCode.getLines()[startLine];
          if (line?.includes(match.input) ?? false) {
            lineNumber = startLine;
            break;
          }
          startLine++;
        }
        const start = sourceCode.getIndexFromLoc({ line: lineNumber + 1, column: comment.loc.start.column });
        const end = sourceCode.getIndexFromLoc({ line: lineNumber + 2, column: 0 });
        removeWallabyComment(context, sourceCode, start, end);
      }
    }
  });
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects wallaby-specific temporary comments like // ? or // ?? or // ?. or // ??. or // file.only or // file.skip and fix it',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    fixable: 'code',
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const comments = sourceCode.getAllComments();
    comments.forEach((comment) => {
      if (comment.type === 'Line') {
        processLineComment(context, sourceCode, comment);
      } else {
        processBlockComment(context, sourceCode, comment);
      }
    });

    return {};
  },
} as Rule.RuleModule;
