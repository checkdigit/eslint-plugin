// agent/no-expect-assertion.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './no-expect-assertion';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'leave non-API calls as is',
      code: `
      function foo() {
        return 'bar';
      }
      async function test() {
        foo().expect(StatusCodes.OK);
      }`,
    },
    {
      name: 'leave fixture.api.xxx() calls as is, which will wait to be converted to fetch calls first',
      code: `
      async function test() {
        await fixture.api.get('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
    },
  ],
  invalid: [
    {
      name: 'assertion without variable declaration',
      code: `async function test() {
        await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - with status code as number instead of StatusCodes enum value',
      code: `async function test() {
        await fetch('/ping/v1/ping').expect(200);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, 200);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - with url as template literal',
      code: `async function test() {
        await fetch(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`);
        assert.equal(pingGetResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - with RequestInit argument',
      code: `async function test() {
        await fetch('/ping/v1/ping', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }).expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingPutResponse = await fetch('/ping/v1/ping', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        assert.equal(pingPutResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - using utility function instead of fetch',
      code: `function ping() {
        return fetch('/ping/v1/ping');
      }
      async function test() {
        await ping().expect(StatusCodes.OK);
      }`,
      output: `function ping() {
        return fetch('/ping/v1/ping');
      }
      async function test() {
        const pingResponse = await ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - using utility function with nested reference',
      code: `function ping() {
        return fetch('/ping/v1/ping');
      }
      const util = { ping };
      async function test() {
        await util.ping().expect(StatusCodes.OK);
      }`,
      output: `function ping() {
        return fetch('/ping/v1/ping');
      }
      const util = { ping };
      async function test() {
        const pingResponse = await util.ping();
        assert.equal(pingResponse.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion with variable declaration',
      code: `async function test() {
        const pingResponse = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        assert(pingResponse);
      }`,
      output: `async function test() {
        const pingResponse = await fetch('/ping/v1/ping');
        assert.equal(pingResponse.status, StatusCodes.OK);
        assert(pingResponse);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response headers assertion',
      code: `async function test() {
        await fetch('/ping/v1/ping')
          .expect(StatusCodes.OK)
          .expect('etag', '123')
          .expect('content-type', 'application/json')
          .expect(ETAG, correctVersion)
          .expect(ETAG, /1.*/u);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        assert.equal(pingGetResponse.headers.get('etag'), '123');
        assert.equal(pingGetResponse.headers.get('content-type'), 'application/json');
        assert.equal(pingGetResponse.headers.get(ETAG), correctVersion);
        assert.ok(pingGetResponse.headers.get(ETAG).match(/1.*/u));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response body assertion',
      code: `async function test() {
        await fetch('/ping/v1/ping').expect({message:'pong'});
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.deepEqual(await pingGetResponse.json(), {message:'pong'});
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response callback assertion',
      code: `async function test() {
        await fetch('/ping/v1/ping')
          .expect(validate)
          .expect((response)=>console.log(response));
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.doesNotThrow(()=>validate(pingGetResponse));
        assert.doesNotThrow(()=>console.log(pingGetResponse));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'multiple fetch calls in the same test',
      code: `function ping() {
        return fetch('/ping/v1/ping');
      }
      async function test() {
        await ping().expect(StatusCodes.OK);
        const pingResponse = await ping().expect(StatusCodes.OK);
        await ping().expect(StatusCodes.OK).expect({message:'pong'});
        await ping().expect(StatusCodes.OK);
      }`,
      output: `function ping() {
        return fetch('/ping/v1/ping');
      }
      async function test() {
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
      name: 'response variable names in different scope do not conflict with each other',
      code: `function ping() {
          return fetch('/ping/v1/ping');
        }
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
      output: `function ping() {
          return fetch('/ping/v1/ping');
        }
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
      name: 'directly return (no await) fetch call with assertion',
      code: `async function test() {
        return fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        return pingGetResponse;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assert response body against function call return value',
      code: `async function test() {
        const createdOn = Date.now().toUTCString();
        await fetch('/ping/v1/ping').expect(200).expect(validateBody(createdOn));
      }`,
      output: `async function test() {
        const createdOn = Date.now().toUTCString();
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, 200);
        assert.deepEqual(await pingGetResponse.json(), validateBody(createdOn));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body',
      code: `async function test() {
        const { body: responseBody } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
        assert.ok(timeDifference >= 0 && timeDifference < 200);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const responseBody = await pingGetResponse.json();
        const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
        assert.ok(timeDifference >= 0 && timeDifference < 200);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body - with nested destructuring',
      code: `async function test() {
        const { body: { pgpPublicKey: firstPgpPublicKey } } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const { pgpPublicKey: firstPgpPublicKey } = await pingGetResponse.json();
        assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers when body is presented as well',
      code: `async function test() {
        const { body, headers: headers2 } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        assert(body);
        assert.ok(headers2.get(ETAG));
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const body = await pingGetResponse.json();
        const headers2 = pingGetResponse.headers;
        assert(body);
        assert.ok(headers2.get(ETAG));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers without body presented but with assertions used',
      code: `async function test() {
        const { header } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        assert.ok(header.get(ETAG));
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const header = pingGetResponse.headers;
        assert.ok(header.get(ETAG));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring',
      code: `async function test() {
        const { headers: { etag } } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const etag = pingGetResponse.headers.get('etag');
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring - string literal key with renaming',
      code: `async function test() {
        const { headers: { 'created-on': createdOn, 'updated-on': updatedOn } } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const createdOn = pingGetResponse.headers.get('created-on');
        const updatedOn = pingGetResponse.headers.get('updated-on');
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'inline access to response body should be extracted to a variable',
      code: `async function test() {
        const paymentSecurityServicePublicKey = (await fetch('/ping/v1/ping').expect(StatusCodes.OK)).body.publicKey;
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const pingGetResponseBody = await pingGetResponse.json();
        const paymentSecurityServicePublicKey = pingGetResponseBody.publicKey;
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
        const pingResponse = await fetch('/ping/v1/ping')
          .expect(StatusCodes.NO_CONTENT)
          .expect(ETAG_HEADER, '1')
          .expect((res) => verifyTemporalHeaders(res, createdOn));
      }`,
      output: `async function test() {
        const createdOn = new Date().toISOString();
        const zoneKeyId = uuid();

        // Import Key
        const keyId = uuid();
        const pingResponse = await fetch('/ping/v1/ping');
        assert.equal(pingResponse.status, StatusCodes.NO_CONTENT);
        assert.equal(pingResponse.headers.get(ETAG_HEADER), '1');
        assert.doesNotThrow(()=>verifyTemporalHeaders(pingResponse, createdOn));
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assignment statement instead of variable declaration used for subsequent fixture calls',
      code: `async function test() {
        let response = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
        response = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        let response = await fetch('/ping/v1/ping');
        assert.equal(response.status, StatusCodes.OK);
        response = await fetch('/ping/v1/ping');
        assert.equal(response.status, StatusCodes.OK);
      }`,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed',
      code: `async function test() {
        const { statusCode } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const statusCode = pingGetResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed - with renaming in ObjectPattern',
      code: `async function test() {
        const { statusCode: pingStatusCode } = await fetch('/ping/v1/ping').expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch('/ping/v1/ping');
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const pingStatusCode = pingGetResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'inside Promise.all',
      code: `
          const responses = await Promise.all([
            fetch('/ping/v1/ping').expect(StatusCodes.NO_CONTENT),
            fetch('/ping/v1/ping').expect(StatusCodes.NO_CONTENT),
          ]);
        `,
      output: `
          const responses = await Promise.all([
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            fetch('/ping/v1/ping').then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            fetch('/ping/v1/ping').then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
          ]);
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'in non-async arrow function with concurrent promises',
      code: `
          await Promise.all(
            Object.keys(zoneKeyPartImportRequest).map((propertyName) => {
              const requestWithPropertyMissing = omit(
                zoneKeyPartImportRequest,
                propertyName,
              );
              return (
                fetch(\`\${BASE_PATH}/zone-key/\${zoneKeyId}\`, {
                  method: 'PUT',
                  body: JSON.stringify(requestWithPropertyMissing),
                }).expect(StatusCodes.BAD_REQUEST)
              );
            }),
          );
        `,
      output: `
          await Promise.all(
            Object.keys(zoneKeyPartImportRequest).map((propertyName) => {
              const requestWithPropertyMissing = omit(
                zoneKeyPartImportRequest,
                propertyName,
              );
              return (
                // eslint-disable-next-line @checkdigit/no-promise-instance-method
                fetch(\`\${BASE_PATH}/zone-key/\${zoneKeyId}\`, {
                  method: 'PUT',
                  body: JSON.stringify(requestWithPropertyMissing),
                }).then((res) => {
                  assert.equal(res.status, StatusCodes.BAD_REQUEST);
                  return res;
                })
              );
            }),
          );
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
  ],
});
