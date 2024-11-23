// agent/fetch-response-status.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './fetch-response-status';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'destructuring status code is fine',
      code: `async function foo() {
        const { status } = await fetch(url);
        assert.equal(status, StatusCode.Ok);
      }`,
    },
    {
      name: 'destructuring status code is fine - with renaming',
      code: `async function foo() {
        const { status: statusCode } = await fetch(url);
        assert.equal(status, StatusCode.Ok);
      }`,
    },
  ],
  invalid: [
    {
      name: 'change statusCode to status - shorthand (no renaming)',
      code: `async function foo() {
        const { statusCode } = await fetch(url);
        assert.equal(statusCode, StatusCode.Ok);
      }`,
      output: `async function foo() {
        const { status: statusCode } = await fetch(url);
        assert.equal(statusCode, StatusCode.Ok);
      }`,
      errors: [{ messageId: 'renameStatusCodeProperty' }],
    },
    {
      name: 'change statusCode to status - leave renamed identifier along',
      code: `async function foo() {
        const { statusCode: someStatusCode } = await fetch(url);
        assert.equal(someStatusCode, StatusCode.Ok);
      }`,
      output: `async function foo() {
        const { status: someStatusCode } = await fetch(url);
        assert.equal(someStatusCode, StatusCode.Ok);
      }`,
      errors: [{ messageId: 'renameStatusCodeProperty' }],
    },
    {
      name: 'not directly destructuring fetch',
      code: `function ping() {
        return fetch(url);
      }
      async function foo() {
        const { statusCode } = await ping();
        assert.equal(statusCode, StatusCode.Ok);
      }`,
      output: `function ping() {
        return fetch(url);
      }
      async function foo() {
        const { status: statusCode } = await ping();
        assert.equal(statusCode, StatusCode.Ok);
      }`,
      errors: [{ messageId: 'renameStatusCodeProperty' }],
    },
  ],
});
