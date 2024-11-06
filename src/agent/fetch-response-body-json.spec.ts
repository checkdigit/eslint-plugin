// agent/fetch-response-body-json.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './fetch-response-body-json';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no change if no "json" property is found in the response type',
      code: `
        const response = {body: 'foo'};
        const body = response.body;
      `,
    },
  ],
  invalid: [
    {
      name: 'first body access is inside variable declaration',
      code: `() => {
        const response = await fetch(url);
        const body = response.body;
      }`,
      output: `() => {
        const response = await fetch(url);
        const body = await response.json();
      }`,
      errors: [{ messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'first body access along with nested property access is inside variable declaration',
      code: `() => {
        const response = await fetch(url);
        const data = response.body.data;
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
const data = responseBody.data;
      }`,
      errors: [{ messageId: 'replaceBodyWithJson' }, { messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'first body access is not inside of variable declaration',
      code: `() => {
        const response = await fetch(url);
        assert(response.body);
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
assert(responseBody);
      }`,
      errors: [{ messageId: 'replaceBodyWithJson' }, { messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'first body access along with nested property access is not inside of variable declaration',
      code: `() => {
        const response = await fetch(url);
        assert(response.body.data);
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
assert(responseBody.data);
      }`,
      errors: [{ messageId: 'replaceBodyWithJson' }, { messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'body access is inside of return statement',
      code: `
        async function foo() {
          const response = await fetch(url);
          return response.body;
        }
      `,
      output: `
        async function foo() {
          const response = await fetch(url);
          const responseBody = await response.json();
return responseBody;
        }
      `,
      errors: [{ messageId: 'replaceBodyWithJson' }, { messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'body access along with nested property access is inside of return statement',
      code: `() => {
        const response = await fetch(url);
        return response.body.data;
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
return responseBody.data;
      }`,
      errors: [{ messageId: 'replaceBodyWithJson' }, { messageId: 'replaceBodyWithJson' }],
    },
    {
      name: 'multiple body access in the same function',
      code: `() => {
        const response = await fetch(url);
        assert(response.body);
        assert(response.body.data);
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
assert(responseBody);
        assert(responseBody.data);
      }`,
      errors: [
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
      ],
    },
    {
      name: 'body access againt multiple responses in the same function',
      code: `() => {
        const response = await fetch(url);
        assert(response.body);
        const response2 = await fetch(url2);
        assert(response2.body);
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
assert(responseBody);
        const response2 = await fetch(url2);
        const response2Body = await response2.json();
assert(response2Body);
      }`,
      errors: [
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
      ],
    },
    {
      name: 'multiple body accesses againt multiple responses in the same function',
      code: `() => {
        const response = await fetch(url);
        assert(response.body);
        assert(response.body.data);
        const response2 = await fetch(url2);
        assert(response2.body);
        assert(response2.body.data);
      }`,
      output: `() => {
        const response = await fetch(url);
        const responseBody = await response.json();
assert(responseBody);
        assert(responseBody.data);
        const response2 = await fetch(url2);
        const response2Body = await response2.json();
assert(response2Body);
        assert(response2Body.data);
      }`,
      errors: [
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
      ],
    },
    {
      name: 'multiple body accesses againt multiple responses in the same function with mixed ordering',
      code: `() => {
        const response = await fetch(url);
        const response2 = await fetch(url2);
        assert(response2.body.data);
        assert(response2.body);
        assert(response.body);
        assert(response.body.data);
      }`,
      output: `() => {
        const response = await fetch(url);
        const response2 = await fetch(url2);
        const response2Body = await response2.json();
assert(response2Body.data);
        assert(response2Body);
        const responseBody = await response.json();
assert(responseBody);
        assert(responseBody.data);
      }`,
      errors: [
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
      ],
    },
    {
      name: 'multiple body accesses againt multiple responses in multiple functions with mixed ordering',
      code: `() => {
        const response = await fetch(url);
        const response2 = await fetch(url2);
        assert(response2.body.data);
        assert(response2.body);
        assert(response.body);
        assert(response.body.data);
      }
      () => {
        const response = await fetch(url3);
        return response.body;
      }`,
      output: `() => {
        const response = await fetch(url);
        const response2 = await fetch(url2);
        const response2Body = await response2.json();
assert(response2Body.data);
        assert(response2Body);
        const responseBody = await response.json();
assert(responseBody);
        assert(responseBody.data);
      }
      () => {
        const response = await fetch(url3);
        const responseBody = await response.json();
return responseBody;
      }`,
      errors: [
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
        { messageId: 'replaceBodyWithJson' },
      ],
    },
  ],
});
