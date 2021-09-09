// no-card-numbers.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Rule } from 'eslint';
import type { Node, SourceLocation } from 'estree';

const CARD_NUMBER_FOUND = 'CARD_NUMBER_FOUND';
const CARD_NUMBERS_FOUND = 'CARD_NUMBERS_FOUND';
const cardNumberRegex = /\d{15,19}/gm;
const allowCardNumbers = [
  '4111111111111111',
  '111111111111111',
  '000000000000000',
  '0000000000000000',
  '00000000000000000',
  '000000000000000000',
  '0000000000000000000',
];

function luhnCheck(cardNumber: string) {
  return (
    cardNumber
      .split('')
      .reverse()
      .map((d) => parseInt(d, 10))
      .reduce((previousValue, currentValue, index) => {
        if (index % 2 === 1) {
          currentValue *= 2;
          if (currentValue > 9) {
            currentValue = (currentValue % 10) + 1;
          }
        }
        return previousValue + currentValue;
      }, 0) %
      10 ===
    0
  );
}

function checkForCardNumbers(value: string, context: Rule.RuleContext, node?: Node, loc?: SourceLocation) {
  const matches = value.match(cardNumberRegex);
  if (matches === null) {
    return;
  }
  const cardNumbers = matches.filter((match) => luhnCheck(match) && allowCardNumbers.indexOf(match) === -1);
  if (cardNumbers.length === 1) {
    if (node !== undefined) {
      context.report({
        messageId: CARD_NUMBER_FOUND,
        data: {
          number: cardNumbers[0] as string,
        },
        node,
      });
    } else if (loc !== undefined) {
      context.report({
        messageId: CARD_NUMBER_FOUND,
        data: {
          number: cardNumbers[0] as string,
        },
        loc: {
          start: loc.start,
          end: loc.end,
        },
      });
    }
  } else if (cardNumbers.length > 1) {
    if (node !== undefined) {
      context.report({
        messageId: CARD_NUMBERS_FOUND,
        data: {
          number: matches.join(', '),
        },
        node,
      });
    } else if (loc !== undefined) {
      context.report({
        messageId: CARD_NUMBERS_FOUND,
        data: {
          number: matches.join(', '),
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
      description: 'Detects if a luhn passing card number',
      url: 'https://github.com/checkdigit/eslint-plugin',
    },
    messages: {
      [CARD_NUMBER_FOUND]: `Valid card number: "{{ number }}"`,
      [CARD_NUMBERS_FOUND]: `Multiple valid card numbers found: "{{ numbers }}"`,
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    const comments = sourceCode.getAllComments();

    comments.forEach((comment) => {
      if (comment.loc !== undefined && comment.loc !== null) {
        checkForCardNumbers(comment.value, context, undefined, comment.loc);
      }
    });
    return {
      Literal(node) {
        if (node.value === undefined) {
          return;
        }
        if (typeof node.value !== 'string' && typeof node.value !== 'number') {
          return;
        }
        const value = node.value + '';
        checkForCardNumbers(value, context, node);
      },
      TemplateElement(node) {
        if (!node.value) return;
        const value = node.value.cooked + '';
        checkForCardNumbers(value, context, node);
      },
    };
  },
} as Rule.RuleModule;
