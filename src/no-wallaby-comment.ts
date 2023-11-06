// no-wallaby-comment.ts

/*
 * Copyright (c) 2022-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule, SourceCode } from 'eslint';
import type { Comment } from 'estree';

const wallabyRegex = /\s*(?:[?]{1,2}\.?|file\.only|file\.skip)\s*/gu;

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
  while (wallabyRegex.exec(comment.value) !== null) {
    if (comment.range) {
      const start = comment.range[0];
      const end = comment.range[1];
      removeWallabyComment(context, sourceCode, start, end);
    }
  }
}

function processBlockComment(context: Rule.RuleContext, sourceCode: SourceCode, comment: Comment): void {
  const commentValues = comment.value.split('\n');
  const blockCommentRegex = /^(?:\s*\*\s*)?(?:file\.only|file\.skip)$/gu;
  commentValues.forEach((commentValue) => {
    let match;
    while (comment.range && (match = wallabyRegex.exec(commentValue)) !== null) {
      let start = 0;
      let end = 0;
      const removeEntireComment = blockCommentRegex.test(comment.value.trim());
      if (removeEntireComment) {
        start = comment.range[0];
        end = comment.range[1];
      } else {
        start = comment.value.indexOf(match.input) + 1;
        end = comment.value.indexOf(match.input) + match.input.length + 2;
      }
      removeWallabyComment(context, sourceCode, start, end);
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
