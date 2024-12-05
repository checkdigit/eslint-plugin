// no-status-code-assert.spec.ts

import rule, { ruleId } from './no-status-code-assert';
import createTester from './ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case with await and expect',
      code: `await fixture.api
            .put(testURI)
            .send(testData)
            .expect(StatusCodes.CREATED);`,
    },
    {
      name: 'Valid case with different property',
      code: `assert(response.otherProperty === 'test');`,
    },
    {
      name: 'Valid case with assert.equal and different property',
      code: `assert.equal(response.otherProperty, 'test');`,
    },
    {
      name: 'Valid case with assert.ok and different property',
      code: `assert.ok(response.otherProperty === 'test');`,
    },
  ],
  invalid: [
    {
      name: 'Invalid case with statusCode directly',
      code: `assert(statusCode === 200);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode directly and different status code',
      code: `assert(statusCode === 400);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode directly in assert.ok',
      code: `assert.ok(statusCode === 400);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode directly in assert.equal',
      code: `assert.equal(test.statusCode, StatusCodes.CREATED);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode in assert.INTERNAL_SERVER_ERROR',
      code: `assert.ok(statusCode === StatusCodes.INTERNAL_SERVER_ERROR);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode in assert.equal',
      code: `assert.equal(statusCode, 200);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode in assert.equal with status code',
      code: `assert.equal(statusCode, StatusCodes.INTERNAL_SERVER_ERROR);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode in a binary expression',
      code: `assert(testStatusCode === StatusCodes.OK);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case in a binary expression with response.statusCode',
      code: `assert(response.statusCode === 200);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with StatusCode',
      code: `assert(StatusCode === 200);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with response.status',
      code: `assert(response.status === StatusCodes.OK);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with response.status and StatusCodes',
      code: `assert(response.status === StatusCodes.SOME_STATUS);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with response.code',
      code: `assert(message.code, 'Expected response.value to be StatusCodes.BAD_REQUEST');`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with response.value',
      code: `assert(response.value === StatusCodes.BAD_REQUEST, 'Expected response.value to be StatusCodes.BAD_REQUEST');`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
    {
      name: 'Invalid case with statusCode as a number literal',
      code: `assert(test === 400);`,
      errors: [
        {
          messageId: 'NO_STATUS_CODE_ASSERT',
        },
      ],
    },
  ],
});
