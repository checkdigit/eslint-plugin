// no-enum.spec.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './no-enum';

const ENUM_FOUND = 'ENUM_FOUND';
const ENUMS_FOUND = 'ENUMS_FOUND';

const ENUM_FOUND_MSG = {
  messageId: ENUM_FOUND,
};

const ENUMS_FOUND_MSG = {
  messageId: ENUMS_FOUND,
};

const LINES_WITH_NO_ENUM = `
const NOT_A_SECRET = "I'm not a secret, I think";
`;

const LINE_WITH_ENUM = `enum States { CREATED, ASSIGNED, CLOSED, ERROR }`;

const LINE_WITH_MULTIPLE_ENUMS = `"TestMethod": {
            "enum": [
                "DEL",
                "GET",
                "PUT"
            ],
            "type": "string"
        },  "ServiceType": {
            "enum": [
                "test1",
                "test2",
                "test3",
                "test4",
                "test5",
                "test6"
            ],
            "type": "string"
        }`;
describe('no-enum', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('no-enum', rule, {
    valid: [
      {
        code: LINES_WITH_NO_ENUM,
      }
    ],
    invalid: [
      {
        code: LINE_WITH_ENUM,
        errors: [ENUM_FOUND_MSG],
        only: true,
      },
      {
        code: LINE_WITH_MULTIPLE_ENUMS,
        errors: [ENUMS_FOUND_MSG],
      },
    ],
  });
});
