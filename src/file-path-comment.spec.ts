// file-path-comment.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './file-path-comment';

const CARD_NUMBER_FOUND = 'CARD_NUMBER_FOUND';

const CARD_NUMBER_FOUND_MSG = {
  messageId: CARD_NUMBER_FOUND,
};

const STRING_TEST = `
const NOT_A_SECRET = "I'm not a secret, I think";
`;

const CONTAINS_CARD_NUMBER_IN_NUMBER = `
const foo = 4507894813950280;
`;

describe('file-path-comment', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('file-path-comment', rule, {
    valid: [
      {
        filename: 'src/hello',
        code: STRING_TEST,
      },
    ],
    invalid: [
      {
        filename: 'src/hello',
        code: CONTAINS_CARD_NUMBER_IN_NUMBER,
        errors: [CARD_NUMBER_FOUND_MSG],
      },
    ],
  });
});
