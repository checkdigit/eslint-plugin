// no-uuid.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node, SourceLocation } from 'estree';
import type { Rule } from 'eslint';

const UUID_FOUND = 'UUID_FOUND';
const UUIDS_FOUND = 'UUIDS_FOUND';
const uuidRegex = /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/gmu;

function checkForUuid(value: string, context: Rule.RuleContext, node?: Node, loc?: SourceLocation) {
  const matches = value.match(uuidRegex);
  if (matches === null) {
    return;
  }
  if (matches.length === 1) {
    if (node !== undefined) {
      context.report({
        messageId: UUID_FOUND,
        data: {
          uuid: matches[0],
        },
        node,
      });
    } else if (loc !== undefined) {
      context.report({
        messageId: UUID_FOUND,
        data: {
          uuid: matches[0],
        },
        loc: {
          start: loc.start,
          end: loc.end,
        },
      });
    }
  } else if (matches.length > 1) {
    if (node !== undefined) {
      context.report({
        messageId: UUIDS_FOUND,
        data: {
          uuids: matches.join(', '),
        },
        node,
      });
    } else if (loc !== undefined) {
      context.report({
        messageId: UUIDS_FOUND,
        data: {
          uuids: matches.join(', '),
        },
        loc: {
          start: loc.start,
          end: loc.end,
        },
      });
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects if a string literal contains a UUID',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [UUID_FOUND]: `UUID found: "{{ uuid }}"`,
      [UUIDS_FOUND]: `Multiple UUIDs found: "{{ uuids }}"`,
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const comments = sourceCode.getAllComments();

    comments.forEach((comment) => {
      if (comment.loc !== undefined && comment.loc !== null) {
        checkForUuid(comment.value, context, undefined, comment.loc);
      }
    });
    return {
      Literal(node) {
        if (node.value === undefined) {
          return;
        }
        if (typeof node.value !== 'string') {
          return;
        }
        const value = node.value;
        checkForUuid(value, context, node);
      },
      TemplateElement(node) {
        if (typeof node.value.cooked !== 'string') {
          return;
        }
        checkForUuid(node.value.cooked, context, node);
      },
    };
  },
} as Rule.RuleModule;
