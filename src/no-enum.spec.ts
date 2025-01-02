// no-enum.spec.ts

import rule, { ruleId } from './no-enum';

import createTester from './ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case with status object and type alias',
      code: `const status = { SUCCESS: 'success', FAILURE: 'failure' }; type Status = 'success' | 'failure';`,
    },
    {
      name: 'Valid case with enum property with in JSON schema definition',
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
    },
    {
      name: 'Valid case with nested enum properties',
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
    },
    {
      name: 'Valid case with deeply nested enum properties',
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
    },
    {
      name: 'Valid case with enum properties in array',
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
    },
  ],
  invalid: [
    {
      name: 'Invalid case with enum declaration',
      code: `enum Days { MONDAY = 'Monday', TUESDAY = 'Tuesday', WEDNESDAY = 'Wednesday' };`,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with export enum declaration',
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
      errors: [{ messageId: 'NO_ENUM' }],
    },
    {
      name: 'Invalid case with enum declaration in an arrow function',
      code: `const example = () => {
           enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3' };};`,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a switch statement',
      code: `switch (value) {
       case 'example':
        enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3' };
        break;  }`,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a function',
      code: `
    function example() {
      enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3' };
    }
   `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a class',
      code: `
      enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2' }
      class Example {
        testName: TEST_NAMES;
      }
    `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a namespace',
      code: `
    namespace ExampleNamespace {
      export enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3', TEST_STRING4 = 'testString4' };
    }
  `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in an interface',
      code: `
       enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3' }
      interface ExampleInterface {
        testName: TEST_NAMES;
      }
     `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a type alias',
      code: `
      enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3' }

      type ExampleType = {
        testName: TEST_NAMES;
      };
     `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
    {
      name: 'Invalid case with enum declaration in a module',
      code: `
    module ExampleModule {
      export enum TEST_NAMES { TEST_STRING1 = 'testString1', TEST_STRING2 = 'testString2', TEST_STRING3 = 'testString3', TEST_STRING4 = 'testString4' };
    }
  `,
      errors: [
        {
          messageId: 'NO_ENUM',
        },
      ],
    },
  ],
});
