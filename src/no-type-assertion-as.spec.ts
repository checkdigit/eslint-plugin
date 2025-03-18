// no-type-assertion-as.spec.ts

import rule, { ruleId } from './no-type-assertion-as';
import createTester from './ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case without type assertion',
      code: `const event = request.body;`,
    },
    {
      name: 'Valid case with type annotation',
      code: `const event: TestEvent = request.body;`,
    },
    {
      name: 'Valid case with satisfies',
      code: `const event = request.body satisfies TestEvent;`,
    },
    {
      name: 'Valid case with satisfies and different type',
      code: `const newEvent = request.body satisfies AnotherEventType;`,
    },
    {
      name: 'Valid case with satisfies and complex type',
      code: `const complexEvent = request.body satisfies { type: string; payload: any };`,
    },
    {
      name: 'Valid case with satisfies and array type',
      code: `const events = request.body satisfies TestEvent[];`,
    },
  ],
  invalid: [
    {
      name: 'Invalid case with as type assertion',
      code: `const event = request.body as TestEvent;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as type assertion and different type',
      code: `const newEvent = request.body as AnotherEventType;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as type assertion and complex type',
      code: `const complexEvent = request.body as { type: string; payload: any };`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as type assertion and array type',
      code: `const events = request.body as TestEvent[];`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as type assertion and union type',
      code: `const result = response as SuccessResponse | ErrorResponse;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as type assertion and intersection type',
      code: `const result = response as SuccessResponse & ErrorResponse;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as unknown type assertion',
      code: `const value = someValue as unknown;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as unknown as type assertion',
      code: `const value = someValue as unknown as SomeType;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as unknown as part of union type assertion',
      code: `const result = response as unknown | SomeType;`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
    {
      name: 'Invalid case with as unknown as part of intersection type assertion',
      code: `const result = response as unknown & SomeType`,
      errors: [{ messageId: 'NO_AS_TYPE_ASSERTION' }],
    },
  ],
});
