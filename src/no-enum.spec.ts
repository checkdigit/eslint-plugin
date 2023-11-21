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
                "Baz",
                "Bar",
                "Foo"
            ],
            "type": "string"
        },
        "ServiceType": {
            "enum": [
                "Baz",
                "Bar",
                "Foo"
            ],
            "type": "string"
        }
    }
};
`;

describe('no-enum', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('no-enum', rule, {
    valid: [
      {
        code: 'const foo = { Foo: 0, Bar: 1, Baz: 2 };',
        filename: 'example.ts',
      },
      {
        code: 'const foo = ["Baz", "Bar", "Foo"];',
        filename: 'example.ts',
      },
      {
        code: 'class Foo {}',
        filename: 'example.ts',
      },
    ],
    invalid: [
      {
        code: `enum Foo {
                foo,
                bar,
                baz,
              } ;
              const test = Foo.bar;`,
        filename: 'example.ts',
        errors: [
          {
            message: 'Avoid using enums in TypeScript files.',
          },
        ],
      },
      {
        code: LINE_WITH_MULTIPLE_ENUMS,
        filename: 'example.ts',
        errors: [
          {
            message: 'Avoid using enums in TypeScript files.',
          },
        ],
      },
    ],
  });
});
