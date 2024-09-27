// no-enum.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-enum';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  const ruleTester = new RuleTester();
  ruleTester.run('no-side-effects', rule, {
    valid: [
      {
        code: `const status = { SUCCESS: 'success', FAILURE: 'failure' }; type Status = 'success' | 'failure';`,
      },
      {
        code: `const shapes = { CIRCLE: 'circle', SQUARE: 'square', TRIANGLE: 'triangle' }; type Shape = 'circle' | 'square' | 'triangle';`,
      },
    ],
    invalid: [
      {
        code: `enum Status { SUCCESS = 'success', FAILURE = 'failure' };`,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
      {
        code: `enum Days { MONDAY = 'Monday', TUESDAY = 'Tuesday', WEDNESDAY = 'Wednesday' };`,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
      {
        code: `export const test = {
                properties: {
                  testString1: {
                    type: 'string'
                  },
                  testType: {
                    type: 'string',
                    enum: ['TEST_KEY'],
                  },
                  testString2: {
                    type: 'string',
                  },
                  testString3: {
                    type: 'string',
                  },
                },
                required: ['testString1', 'testType', 'testString2', 'testString3'],
                type: 'object',
              };`,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
      {
        code: `export enum TEST_NAMES {
                testString1 = 'testString1',
                testString2 = 'testString2',
                testString3 = 'testString3',
                testString4 = 'testString4',
                testString5 = 'testString5',
                testString6 = 'testString6',
                testString7 = 'testString7',
                testString8 = 'testString8',
                testString9 = 'testString9',
              }`,
        filename: 'test-names.enum.ts',
        errors: [{ messageId: 'NO_ENUM' }],
      },
      {
        code: `
            const complexStructure = {
              nested: {
                enum: ['VALUE1', 'VALUE2'],
                anotherProperty: {
                  enum: ['VALUE3', 'VALUE4'],
                },
              },
            };
          `,
        errors: [
          {
            messageId: 'NO_ENUM',
          },
          {
            messageId: 'NO_ENUM',
          },
        ],
      },
      {
        code: `
          const complexStructure = {
            level1: {
              level2: {
                enum: ['VALUE1', 'VALUE2'],
                level3: {
                  enum: ['VALUE3', 'VALUE4'],
                  level4: {
                    someProperty: 'someValue',
                    enum: ['VALUE5', 'VALUE6'],
                    level5: {
                      anotherProperty: {
                        enum: ['VALUE7', 'VALUE8'],
                      },
                    },
                  },
                },
              },
            },
          };
        `,
        errors: [
          { messageId: 'NO_ENUM' },
          { messageId: 'NO_ENUM' },
          { messageId: 'NO_ENUM' },
          { messageId: 'NO_ENUM' },
        ],
      },
      {
        code: `
          const complexStructure = {
            level1: [
              {
                level2: {
                  enum: ['VALUE1', 'VALUE2'],
                },
              },
              {
                level2: {
                  level3: [
                    {
                      enum: ['VALUE3', 'VALUE4'],
                    },
                  ],
                },
              },
            ],
          };
        `,
        errors: [{ messageId: 'NO_ENUM' }, { messageId: 'NO_ENUM' }],
      },
    ],
  });
});
