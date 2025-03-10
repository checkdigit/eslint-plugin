// no-random-v4-uuid.spec.ts

import rule, { ruleId } from './no-random-v4-uuid.ts';
import createTester from './ts-tester.test.ts';

createTester().run(ruleId, rule, {
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
      name: 'Valid case with different version import',
      code: `import { v5 } from 'uuid';
               const namespace = '12345678-1234-1234-1234-123456789abc';
               const newUuid = v5('name', namespace);`,
    },
    {
      name: 'Valid case with different crypto method',
      code: `import { randomInt } from 'node:crypto';
         const id = randomInt(1, 100);`,
    },
    {
      name: 'Valid case with different import',
      code: `import { randomBytes } from 'node:crypto';
         const id = randomBytes(16);`,
    },
  ],
  invalid: [
    {
      name: 'Invalid case with uuid.v4',
      code: `import  uuid  from 'uuid';
               const id = uuid.v4();`,
      errors: [
        {
          messageId: 'NO_UUID_MODULE_FOR_V4',
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
          messageId: 'NO_UUID_MODULE_FOR_V4',
        },
      ],
    },
    {
      name: 'Invalid case with import',
      code: `import { v4 } from 'uuid';
               const newUuid = v4();`,
      errors: [
        {
          messageId: 'NO_UUID_MODULE_FOR_V4',
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
          messageId: 'NO_UUID_MODULE_FOR_V4',
        },
        {
          messageId: 'NO_UUID_MODULE_FOR_V4',
        },
      ],
    },
    {
      name: 'Invalid case with crypto.randomUUID',
      code: `import { randomUUID } from 'node:crypto';
         const id = randomUUID();`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with alias import from crypto',
      code: `import { randomUUID as uuid } from 'node:crypto';
         const id = uuid();`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with all the named exports crypto namespace',
      code: `import * as crypto from 'node:crypto';
         const id = crypto.randomUUID();`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with mixed imports',
      code: `import { randomUUID, randomBytes } from 'node:crypto';
         const id = randomUUID();
         const bytes = randomBytes(16);`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with crypto namespace',
      code: `import crypto from 'node:crypto';
         const id = crypto.randomUUID();`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with mixed import and alias',
      code: `import crypto, { randomInt, randomUUID as uuid } from 'node:crypto';
         const id = uuid();`,
      errors: [
        {
          messageId: 'NO_RANDOM_V4_UUID',
        },
      ],
    },
    {
      name: 'Invalid case with uuid module used only for v4 UUID generation',
      code: `import { v4 } from 'uuid';
         const id = v4();`,
      errors: [
        {
          messageId: 'NO_UUID_MODULE_FOR_V4',
        },
      ],
    },
    {
      name: 'Invalid case with uuid module used only for alias v4 UUID generation',
      code: `import { v4 as uuid } from 'uuid';
         const id = uuid();`,
      errors: [
        {
          messageId: 'NO_UUID_MODULE_FOR_V4',
        },
      ],
    },
  ],
});
