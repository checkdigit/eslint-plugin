// no-random-v4-uuid.spec.ts

import rule, { ruleId } from './no-random-v4-uuid';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
  });

  ruleTester.run(ruleId, rule, {
    valid: [
      {
        name: 'Valid case with different uuid method',
        code: `import  uuid  from 'uuid';
               const id = uuid.v1();`,
      },
      {
        name: 'Valid case with different alias import',
        code: `import { v3 as uuid3 } from 'uuid';
               const namespace = '12345678-1234-1234-1234-123456789abc';
               export function v3(): string {
                  return uuid3('name', namespace);
              }`,
      },
      {
        name: 'Valid case with different alias import',
        code: `import { v5 } from 'uuid';
               const namespace = '12345678-1234-1234-1234-123456789abc';
               const newUuid = v5('name', namespace);`,
      },
    ],
    invalid: [
      {
        name: 'Invalid case with uuid.v4',
        code: `import  uuid  from 'uuid';
               const id = uuid.v4();`,
        errors: [
          {
            messageId: 'NO_RANDOM_V4_UUID',
          },
        ],
      },
      {
        name: 'Invalid case with alias import',
        code: `import { v4 as uuid4 } from 'uuid';
               export function v4(): string {
                   return uuid4();
               }`,
        errors: [
          {
            messageId: 'NO_RANDOM_V4_UUID',
          },
        ],
      },
      {
        name: 'Invalid case with import',
        code: `import { v4 } from 'uuid';
               const newUuid = v4();`,
        errors: [
          {
            messageId: 'NO_RANDOM_V4_UUID',
          },
        ],
      },
      {
        name: 'Invalid case with multiple imports',
        code: `import { v1, v3, v4, v5 } from 'uuid';
        
               const uuidV1 = v1();
      
               const namespace = v4();
               const uuidV3 = v3('name', namespace);
            
               const uuidV4 = v4();
            
               const uuidV5 = v5('name', namespace);`,
        errors: [
          {
            messageId: 'NO_RANDOM_V4_UUID',
          },
          {
            messageId: 'NO_RANDOM_V4_UUID',
          },
        ],
      },
    ],
  });
});
