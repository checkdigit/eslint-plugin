// no-card-numbers.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Node, SourceLocation } from 'estree';
import type { Rule } from 'eslint';

const CARD_NUMBER_FOUND = 'CARD_NUMBER_FOUND';
const CARD_NUMBERS_FOUND = 'CARD_NUMBERS_FOUND';
const cardNumberRegex = /\d{15,19}/gmu;
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
      .map((digit) => parseInt(digit, 10))
      .reduce((previousValue, currentValue, index) => {
        let value = currentValue;
        if (index % 2 === 1) {
          value *= 2;
          // eslint-disable-next-line no-magic-numbers
          if (value > 9) {
            value = (value % 10) + 1;
          }
        }
        return previousValue + value;
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
  const cardNumbers = matches.filter(
    (match) =>
      luhnCheck(match) &&
      !allowCardNumbers.includes(match) &&
      // any 16-digit number that begins with 0-1 or 7-9 is not a valid card number
      !match.startsWith('0') &&
      !match.startsWith('1') &&
      !match.startsWith('7') &&
      !match.startsWith('8') &&
      !match.startsWith('9'),
  );
  if (cardNumbers.length === 1) {
    const cardNumber = cardNumbers[0];
    if (cardNumber !== undefined) {
      if (node !== undefined) {
        context.report({
          messageId: CARD_NUMBER_FOUND,
          data: {
            number: cardNumber,
          },
          node,
        });
      } else if (loc !== undefined) {
        context.report({
          messageId: CARD_NUMBER_FOUND,
          data: {
            number: cardNumber,
          },
          loc: {
            start: loc.start,
            end: loc.end,
          },
        });
      }
    }
  } else if (cardNumbers.length > 1) {
    if (node !== undefined) {
      context.report({
        messageId: CARD_NUMBERS_FOUND,
        data: {
          numbers: matches.join(', '),
        },
        node,
      });
    } else if (loc !== undefined) {
      context.report({
        messageId: CARD_NUMBERS_FOUND,
        data: {
          numbers: matches.join(', '),
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
    const sourceCode = context.sourceCode;
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
        const value = String(node.value);
        checkForCardNumbers(value, context, node);
      },
      TemplateElement(node) {
        if (typeof node.value.cooked !== 'string') {
          return;
        }
        checkForCardNumbers(node.value.cooked, context, node);
      },
    };
  },
} as Rule.RuleModule;
