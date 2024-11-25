// agent/no-supertest.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './no-supertest';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'handle destructuring variable declaration for headers without body/assertion presented does not need to change',
      code: `async function test() {
        const { headers } = await ping();
        assert.ok(headers.get(ETAG));
      }`,
    },
    {
      name: 'skip concurrent supertest calls which will be handled in "supertest-then" rule',
      code: `async function test() {
        const responses = await Promise.all([
          ping().expect(StatusCodes.OK),
          ping().expect(StatusCodes.OK),
        ]);
      }`,
    },
    {
      name: 'leave fixture.api.xxx() calls as is, which will be handled by no-fixture rule',
      code: `async function test() {
        await fixture.api.get(url).expect(StatusCodes.OK);
      }`,
    },
  ],
  invalid: [
    {
      name: 'assertion without variable declaration',
      code: `async function test() {
        await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion with variable declaration',
      code: `async function test() {
        const pingResponse = await ping().expect(StatusCodes.OK);
        assert(pingResponse.body);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const pingResponseBody = await pingResponse.json();
        assert(pingResponseBody);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response headers assertion should be externalized with new variable declared if necessary',
      code: `async function test() {
        await ping()
          .expect(StatusCodes.OK)
          .expect('etag', '123')
          .expect('content-type', 'application/json')
          .expect(ETAG, correctVersion)
          .expect(ETAG, /1.*/u);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        assert.equal(pingResponse.headers.get('etag'), '123');
        assert.equal(pingResponse.headers.get('content-type'), 'application/json');
        assert.equal(pingResponse.headers.get(ETAG), correctVersion);
        assert.ok(pingResponse.headers.get(ETAG).match(/1.*/u));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response body assertion',
      code: `async function test() {
        await ping().expect({message:'pong'});
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.deepEqual(await pingResponse.json(), {message:'pong'});
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response callback assertion',
      code: `async function test() {
        await ping()
          .expect(validate)
          .expect((response)=>console.log(response));
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.doesNotThrow(()=>validate(pingResponse));
        assert.doesNotThrow(()=>console.log(pingResponse));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'multiple fixture calls in the same test',
      code: `async function test() {
        await ping().expect(StatusCodes.OK);
        const pingResponse = await ping().expect(StatusCodes.OK);
        await ping().expect(StatusCodes.OK).expect({message:'pong'});
        await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse1 = await ping();
        assert.equal(pingResponse1.status, StatusCodes.OK);
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const pingResponse2 = await ping();
        assert.equal(pingResponse2.status, StatusCodes.OK);
        assert.deepEqual(await pingResponse2.json(), {message:'pong'});
        const pingResponse3 = await ping();
        assert.equal(pingResponse3.status, StatusCodes.OK);
      }`,
      errors: [
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
      ],
    },
    {
      name: 'directly return (no await) fixture call with assertion',
      code: `async function test() {
        return ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        return pingResponse;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'work with response status literal (e.g. 200 instead of StatusCoodes.OK) as well',
      code: `async function test() {
        await util.ping().expect(200);
      }`,
      output: `async function test() {
        const pingResponse = await util.ping();
        assert.equal(pingResponse.status, 200);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assert response body against function call\'s return value ".expect(validateBody(response))"',
      code: `async function test() {
        const createdOn = Date.now().toUTCString();
        await ping().expect(200).expect(validateBody(createdOn));
      }`,
      output: `async function test() {
        const createdOn = Date.now().toUTCString();
        const pingResponse = await ping();
        assert.equal(pingResponse.status, 200);
        assert.deepEqual(await pingResponse.json(), validateBody(createdOn));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body',
      code: `async function test() {
        const { body: responseBody } = await ping().expect(StatusCodes.OK);
        const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
        assert.ok(timeDifference >= 0 && timeDifference < 200);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const responseBody = await pingResponse.json();
        const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
        assert.ok(timeDifference >= 0 && timeDifference < 200);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body - with nested destructuring',
      code: `async function test() {
        const { body: { pgpPublicKey: firstPgpPublicKey } } = await ping().expect(StatusCodes.OK);
        assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const { pgpPublicKey: firstPgpPublicKey } = await pingResponse.json();
        assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers when body is presented as well',
      code: `async function test() {
        const { body, headers: headers2 } = await ping().expect(StatusCodes.OK);
        assert(body);
        assert.ok(headers2.get(ETAG));
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const body = await pingResponse.json();
        const headers2 = pingResponse.headers;
        assert(body);
        assert.ok(headers2.get(ETAG));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers without body presented but with assertions used',
      code: `async function test() {
        const { headers } = await ping().expect(StatusCodes.OK);
        assert.ok(headers.get(ETAG));
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const headers = pingResponse.headers;
        assert.ok(headers.get(ETAG));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'avoid response variable name conflict with existing variables in the same scope',
      code: `async () => {
        const pingResponse = 'foo';
        const pingResponse1 = 'bar';
        await ping().expect(StatusCodes.OK);
        await ping().expect(StatusCodes.OK);
      }`,
      output: `async () => {
        const pingResponse = 'foo';
        const pingResponse1 = 'bar';
        const pingResponse2 = await ping();
        assert.equal(pingResponse2.status, StatusCodes.OK);
        const pingResponse3 = await ping();
        assert.equal(pingResponse3.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response variable names in different scope do not conflict with each other',
      code: `
        it('#1', async () => {
          const pingResponse = 'foo';
        });
        it('#2', async () => {
          const pingResponse = 'foo';
          await ping().expect(StatusCodes.OK);
        });
        it('#3', async () => {
          const pingResponse3 = 'foo';
          await ping().expect(StatusCodes.OK);
        });
      `,
      output: `
        it('#1', async () => {
          const pingResponse = 'foo';
        });
        it('#2', async () => {
          const pingResponse = 'foo';
          const pingResponse1 = await ping();
          assert.equal(pingResponse1.status, StatusCodes.OK);
        });
        it('#3', async () => {
          const pingResponse3 = 'foo';
          const pingResponse = await ping();
          assert.equal(pingResponse.status, StatusCodes.OK);
        });
      `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'inline access to response body should be extracted to a variable',
      code: `export async function validatePin(
        fixture,
      ) {
        const paymentSecurityServicePublicKey = (await ping().expect(StatusCodes.OK)).body.publicKey;
      }`,
      output: `export async function validatePin(
        fixture,
      ) {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const pingResponseBody = await pingResponse.json();
        const paymentSecurityServicePublicKey = pingResponseBody.publicKey;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'callback assertion using arrow function that accesses to response might conflict with the new/redefined response variable',
      code: `async function test() {
        const createdOn = new Date().toISOString();
        const zoneKeyId = uuid();

        // Import Key
        const keyId = uuid();
        await ping()
          .expect(StatusCodes.NO_CONTENT)
          .expect(ETAG_HEADER, '1')
          .expect((res) => verifyTemporalHeaders(res, createdOn));
      }`,
      output: `async function test() {
        const createdOn = new Date().toISOString();
        const zoneKeyId = uuid();

        // Import Key
        const keyId = uuid();
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.NO_CONTENT);
        assert.equal(pingResponse.headers.get(ETAG_HEADER), '1');
        assert.doesNotThrow(()=>verifyTemporalHeaders(pingResponse, createdOn));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assignment statement instead of variable declaration used for subsequent fixture calls',
      code: `async function test() {
        let response = await ping().expect(StatusCodes.OK);
        response = await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        let response = await ping();
        assert.equal(response.status, StatusCodes.OK);
        response = await ping();
        assert.equal(response.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring',
      code: `async function test() {
        const { headers: { etag } } = await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const etag = pingResponse.headers.get('etag');
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring - string literal key with renaming',
      code: `async function test() {
        const { headers: { 'created-on': createdOn, 'updated-on': updatedOn } } = await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const createdOn = pingResponse.headers.get('created-on');
        const updatedOn = pingResponse.headers.get('updated-on');
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed',
      code: `async function test() {
        const { statusCode } = await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const statusCode = pingResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed',
      code: `async function test() {
        const { statusCode: pingStatusCode } = await ping().expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
        const pingStatusCode = pingResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
  ],
});
