// no-enum.spec.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './no-enum';

const LINE_WITH_MULTIPLE_ENUMS = `
const test = {
    "TestEnums": {
        "TestMethod": {
            "enum": [
                "DEL",
                "GET",
                "PUT"
            ],
            "type": "string"
        },
        "ServiceType": {
            "enum": [
                "test1",
                "test2",
                "test3",
                "test4",
                "test5",
                "test6"
            ],
            "type": "string"
        }
    }
};
`;

// file.only
describe('no-enum', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('no-enum', rule, {
    valid: [
      {
        code: 'const colors = { Red: 0, Green: 1, Blue: 2 };',
        filename: 'example.ts',
      },
      {
        code: 'const days = ["Sunday", "Monday", "Tuesday"];',
        filename: 'example.ts',
      },
      {
        code: 'class Car {}',
        filename: 'example.ts',
      },
    ],
    invalid: [
      {
        code: `enum CompassDirection {
                North,
                East,
                South,
                West,
              } ;
              const startingDirection = CompassDirection.East;`,
        errors: [{
          message: 'Avoid using enums in TypeScript files.'
        }],
      },
      {
        code: LINE_WITH_MULTIPLE_ENUMS,
        errors: [{
          message: 'Avoid using enums in TypeScript files.'
        }],
        only: true,
      },
    ],
  });
});
