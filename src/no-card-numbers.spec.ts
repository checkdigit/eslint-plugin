// no-card-numbers.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

import rule from './no-card-numbers';

const CARD_NUMBER_FOUND = 'CARD_NUMBER_FOUND';
const CARD_NUMBERS_FOUND = 'CARD_NUMBERS_FOUND';

const CARD_NUMBER_FOUND_MSG = {
  messageId: CARD_NUMBER_FOUND,
};

const CARD_NUMBERS_FOUND_MSG = {
  messageId: CARD_NUMBERS_FOUND,
};

const STRING_TEST = `
const NOT_A_SECRET = "I'm not a secret, I think";
`;

// eslint-disable-next-line no-template-curly-in-string
const TEMPLATE_TEST = "const NOT_A_SECRET = `A template that isn't a secret. ${1+1} = 2`";

const CONTAINS_CARD_NUMBER_IN_NUMBER = `
const foo = 4507894813950280;
`;

const CONTAINS_A_PASSING_CARD_NUMBER = `
const foo = 4111111111111111;
const fuz = 123111111111111111567;
const bar = 111111111111111;
const baz = '000000000000000';
const far = '0000000000000000';
const faz = '00000000000000000';
const doo = '000000000000000000';
const dar = '0000000000000000000';
`;

const CONTAINS_A_PASSING_CARD_NUMBER_IN_COMMENT = `
// 4111111111111111;
// 123111111111111111567;
// 111111111111111;
// 000000000000000;
// 0000000000000000;
// 00000000000000000;
// 000000000000000000;
// 0000000000000000000;
`;

const CONTAINS_SEVERAL_CARD_NUMBERS_IN_STRING = `
const foo = '4507894813950280 aa 4939816588221579';
`;

const CONTAINS_CARD_NUMBER_IN_COMMENT = `
// this test will be using this valid card number -> 4507894813950280
const foo = 'nothing wrong here';
`;

const CONTAINS_SEVERAL_CARD_NUMBERS_IN_COMMENT = `
// this test will be using these valid card numbers -> 4507894813950280 and 4732643354095204
const foo = 'nothing wrong here';
`;

const STRING_WITH_CARD_NUMBER_THAT_DOESNT_PASS_LUHN_CHECK = `
  const foo = 4507894813950285;
`;

const CONTAINS_PASSING_BUT_INVALID_0_PREFIX_CARD_NUMBER_IN_STRING = `
const foo = '0027576507977237';
`;

const CONTAINS_PASSING_BUT_INVALID_1_PREFIX_CARD_NUMBER_IN_STRING = `
const foo = '1237027241007794';
`;

const CONTAINS_PASSING_BUT_INVALID_7_PREFIX_CARD_NUMBER_IN_STRING = `
const foo = '7603721237334401';
`;

const CONTAINS_PASSING_BUT_INVALID_8_PREFIX_CARD_NUMBER_IN_STRING = `
const foo = '8119915764450821';
`;

const CONTAINS_PASSING_BUT_INVALID_9_PREFIX_CARD_NUMBER_IN_STRING = `
const foo = '9118724531442999';
`;

describe('no-card-numbers', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaVersion: 2020 },
    },
  });
  ruleTester.run('no-card-numbers', rule, {
    valid: [
      {
        code: STRING_TEST,
      },
      {
        code: TEMPLATE_TEST,
      },
      {
        code: STRING_WITH_CARD_NUMBER_THAT_DOESNT_PASS_LUHN_CHECK,
      },
      {
        code: CONTAINS_A_PASSING_CARD_NUMBER,
      },
      {
        code: CONTAINS_A_PASSING_CARD_NUMBER_IN_COMMENT,
      },
      {
        code: CONTAINS_PASSING_BUT_INVALID_0_PREFIX_CARD_NUMBER_IN_STRING,
      },
      {
        code: CONTAINS_PASSING_BUT_INVALID_1_PREFIX_CARD_NUMBER_IN_STRING,
      },
      {
        code: CONTAINS_PASSING_BUT_INVALID_7_PREFIX_CARD_NUMBER_IN_STRING,
      },
      {
        code: CONTAINS_PASSING_BUT_INVALID_8_PREFIX_CARD_NUMBER_IN_STRING,
      },
      {
        code: CONTAINS_PASSING_BUT_INVALID_9_PREFIX_CARD_NUMBER_IN_STRING,
      },
    ],
    invalid: [
      {
        code: CONTAINS_CARD_NUMBER_IN_NUMBER,
        errors: [CARD_NUMBER_FOUND_MSG],
      },
      {
        code: CONTAINS_SEVERAL_CARD_NUMBERS_IN_STRING,
        errors: [CARD_NUMBERS_FOUND_MSG],
      },
      {
        code: CONTAINS_CARD_NUMBER_IN_COMMENT,
        errors: [CARD_NUMBER_FOUND_MSG],
      },
      {
        code: CONTAINS_SEVERAL_CARD_NUMBERS_IN_COMMENT,
        errors: [CARD_NUMBERS_FOUND_MSG],
      },
    ],
  });
});
