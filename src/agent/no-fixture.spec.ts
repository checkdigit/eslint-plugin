// agent/no-fixture.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './no-fixture';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'skip concurrent fixture calls which will be handled in concurrent-promises rule',
      code: `
          const responses = await Promise.all([
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData).expect(StatusCodes.NO_CONTENT),
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData).expect(StatusCodes.NO_CONTENT),
          ]);
        `,
    },
  ],
  invalid: [
    {
      name: 'without assertions',
      code: `
          const responses = await Promise.all([
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData),
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData),
          ]);
        `,
      output: `
          const responses = await Promise.all([
            fetch(\`\${BASE_PATH}/key\`, {
              method: 'PUT',
              body: JSON.stringify(keyData),
            }),
            fetch(\`\${BASE_PATH}/key\`, {
              method: 'PUT',
              body: JSON.stringify(keyData),
            }),
          ]);
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion with variable declaration',
      code: `
          import { BASE_PATH } from './index';
          const pingResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          const body = pingResponse.body;
          const timeDifference = Date.now() - new Date(body.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingResponse.status, StatusCodes.OK);
          const body = await pingResponse.json();
          const timeDifference = Date.now() - new Date(body.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - complex status assertion argument',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'PUT with request body',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`).send(cardCreationData).expect(StatusCodes.BAD_REQUEST);
        `,
      output: `
          import { BASE_PATH } from './index';
          const cardPutResponse = await fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
            method: 'PUT',
            body: JSON.stringify(cardCreationData),
          });
          assert.equal(cardPutResponse.status, StatusCodes.BAD_REQUEST);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'PUT with request header',
      code: `
          import { BASE_PATH } from './index';
          const noFraudResponse = await fixture.api
            .post(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .set(IF_MATCH_HEADER, originalCard.version)
            .set('abc', originalCard.name)
            .set('x-y-z', '123')
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          import { BASE_PATH } from './index';
          const noFraudResponse = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'POST',
            headers: {
              [IF_MATCH_HEADER]: originalCard.version,
              abc: originalCard.name,
              'x-y-z': '123',
            },
          });
          assert.equal(noFraudResponse.status, StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'set request header with "!" (non-null assertion operator)',
      code: `
          import { BASE_PATH } from './index';
          const noFraudResponse = await fixture.api
            .post(\`\${BASE_PATH}/ping\`)
            .set(IF_MATCH_HEADER, originalCard.version!)
            .set('x-y-z', headers[ETAG]!)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          import { BASE_PATH } from './index';
          const noFraudResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'POST',
            headers: {
              [IF_MATCH_HEADER]: originalCard.version!,
              'x-y-z': headers[ETAG]!,
            },
          });
          assert.equal(noFraudResponse.status, StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'POST without request header/body',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api
            .post(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          import { BASE_PATH } from './index';
          const cardBlockPostResponse = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'POST',
          });
          assert.equal(cardBlockPostResponse.status, StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'replace del with DELETE',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api
            .del(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          import { BASE_PATH } from './index';
          const cardBlockDeleteResponse = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'DELETE',
          });
          assert.equal(cardBlockDeleteResponse.status, StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response headers assertion should be externalized with new variable declared if necessary',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v2/ping\`)
            .expect(StatusCodes.OK)
            .expect('etag', '123')
            .expect('content-type', 'application/json')
            .expect(ETAG, correctVersion)
            .expect(ETAG, /1.*/u);
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          assert.equal(pingGetResponse.headers.get('etag'), '123');
          assert.equal(pingGetResponse.headers.get('content-type'), 'application/json');
          assert.equal(pingGetResponse.headers.get(ETAG), correctVersion);
          assert.ok(pingGetResponse.headers.get(ETAG).match(/1.*/u));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response body assertion',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v2/ping\`).expect({message:'pong'});
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.deepEqual(await pingGetResponse.json(), {message:'pong'});
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response callback assertion',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v2/ping\`)
          .expect(validate)
          .expect((response)=>console.log(response));
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.doesNotThrow(()=>validate(pingGetResponse));
          assert.doesNotThrow(()=>console.log(pingGetResponse));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'multiple fixture calls in the same test',
      code: `
          import { BASE_PATH } from './index';
          async function test() {
            await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
            const pingGetResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
            await fixture.api.get(\`/sample-service/v1/ping?param=xxx\`).expect(StatusCodes.OK).expect({message:'pong'});
            await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          }
        `,
      output: `
          import { BASE_PATH } from './index';
          async function test() {
            const pingGetResponse1 = await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse1.status, StatusCodes.OK);
            const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse.status, StatusCodes.OK);
            const pingGetResponse2 = await fetch(\`\${BASE_PATH}/ping?param=xxx\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse2.status, StatusCodes.OK);
            assert.deepEqual(await pingGetResponse2.json(), {message:'pong'});
            const pingGetResponse3 = await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse3.status, StatusCodes.OK);
          }
        `,
      errors: [
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
        { messageId: 'preferNativeFetch' },
      ],
    },
    {
      name: 'directly return (no await) fixture call',
      code: `
        import { BASE_PATH } from './index';
        () => {
          return fixture.api.get(\`/sample-service/v1/ping\`);
        }`,
      output: `
        import { BASE_PATH } from './index';
        () => {
          return fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
        }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'directly return (no await) fixture call with assertion',
      code: `
        import { BASE_PATH } from './index';
        async () => {
          return fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        }`,
      output: `
        import { BASE_PATH } from './index';
        async () => {
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          return pingGetResponse;
        }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'directly return (no await) fixture call with body/headers',
      code: `
        import { BASE_PATH } from './index';
        () => {
          return fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`)
            .set(IF_MATCH_HEADER, originalCard.version)
            .send({});
        }`,
      output: `
        import { BASE_PATH } from './index';
        () => {
          return fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
            method: 'PUT',
            body: JSON.stringify({}),
            headers: {
              [IF_MATCH_HEADER]: originalCard.version,
            },
          });
        }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'replace statusCode with status',
      code: `
          import { BASE_PATH } from './index';
          const response = await fixture.api.get(\`/sample-service/v2/ping\`);
          assert.equal(response.statusCode, StatusCodes.OK);
          console.log('status:', response.statusCode);
          const response2 = await fixture.api.get(\`/sample-service/v2/ping\`);
          assert.equal(response2.status, StatusCodes.OK);
        `,
      output: `
          import { BASE_PATH } from './index';
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          console.log('status:', response.status);
          const response2 = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response2.status, StatusCodes.OK);
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'replace header access through response.get() with response.headers.get()',
      code: `
          import { BASE_PATH } from './index';
          const response = await fixture.api.get(\`/sample-service/v2/ping\`).expect(StatusCodes.OK);
          assert.equal(response.get(ETAG), correctVersion);
          assert.equal(response.get('etag'), correctVersion);
        `,
      output: `
          import { BASE_PATH } from './index';
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          assert.equal(response.headers.get(ETAG), correctVersion);
          assert.equal(response.headers.get('etag'), correctVersion);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'work with response status literal (e.g. 200 instead of StatusCoodes.OK) as well',
      code: `
          import { BASE_PATH } from './index';
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200);
        `,
      output: `
          import { BASE_PATH } from './index';
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, 200);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assert response body against function call\'s return value ".expect(validateBody(response))"',
      code: `
          import { BASE_PATH } from './index';
          const createdOn = Date.now().toUTCString();
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200).expect(validateBody(createdOn));
        `,
      output: `
          import { BASE_PATH } from './index';
          const createdOn = Date.now().toUTCString();
          const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, 200);
          assert.deepEqual(await pingGetResponse.json(), validateBody(createdOn));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body',
      code: `
          const { body: responseBody } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
      output: `
          const pingGetResponse = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          const responseBody = await pingGetResponse.json();
          const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for body - with nested destructuring',
      code: `
          const { body: { pgpPublicKey: firstPgpPublicKey } } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
        `,
      output: `
          const pingGetResponse = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          const { pgpPublicKey: firstPgpPublicKey } = await pingGetResponse.json();
          assert.ok(firstPgpPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers when body is presented as well',
      code: `
          const { body, headers: headers2 } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          assert(body);
          assert.ok(headers2.get(ETAG));
        `,
      output: `
          const pingGetResponse = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          const body = await pingGetResponse.json();
          const headers2 = pingGetResponse.headers;
          assert(body);
          assert.ok(headers2.get(ETAG));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers without body presented but with assertions used',
      code: `
          const { headers } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          assert.ok(headers.get(ETAG));
        `,
      output: `
          const pingGetResponse = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingGetResponse.status, StatusCodes.OK);
          const headers = pingGetResponse.headers;
          assert.ok(headers.get(ETAG));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'handle destructuring variable declaration for headers without body/assertion presented does not need to change',
      code: `
          const { headers } = await fixture.api.get(\`$\{BASE_PATH}/ping\`);
          assert.ok(headers.get(ETAG));
        `,
      output: `
          const { headers } = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.ok(headers.get(ETAG));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'avoid response variable name conflict with existing variables in the same scope',
      code: `
          async () => {
            const pingGetResponse = 'foo';
            const pingGetResponse1 = 'bar';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          }
        `,
      output: `
          async () => {
            const pingGetResponse = 'foo';
            const pingGetResponse1 = 'bar';
            const pingGetResponse2 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse2.status, StatusCodes.OK);
            const pingGetResponse3 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse3.status, StatusCodes.OK);
          }
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'response variable names in different scope do not conflict with each other',
      code: `
          it('#1', async () => {
            const pingGetResponse = 'foo';
          });
          it('#2', async () => {
            const pingGetResponse = 'foo';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          });
          it('#3', async () => {
            const pingGetResponse3 = 'foo';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          });
        `,
      output: `
          it('#1', async () => {
            const pingGetResponse = 'foo';
          });
          it('#2', async () => {
            const pingGetResponse = 'foo';
            const pingGetResponse1 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse1.status, StatusCodes.OK);
          });
          it('#3', async () => {
            const pingGetResponse3 = 'foo';
            const pingGetResponse = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(pingGetResponse.status, StatusCodes.OK);
          });
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'inline access to response body should be extracted to a variable',
      code: `
        export async function validatePin(
          fixture,
        ) {
          const paymentSecurityServicePublicKey = (await fixture.api.get(\`\${BASE_PATH}/public-key\`).expect(StatusCodes.OK)).body.publicKey;
        }
        `,
      output: `
        export async function validatePin(
          fixture,
        ) {
          const publicKeyGetResponse = await fetch(\`\${BASE_PATH}/public-key\`, {
            method: 'GET',
          });
          assert.equal(publicKeyGetResponse.status, StatusCodes.OK);
          const publicKeyGetResponseBody = await publicKeyGetResponse.json();
          const paymentSecurityServicePublicKey = publicKeyGetResponseBody.publicKey;
        }
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'callback assertion using arrow function that accesses to response might conflict with the new/redefined response variable',
      code: `
          const createdOn = new Date().toISOString();
          const zoneKeyId = uuid();

          // Import Key
          const keyId = uuid();
          await fixture.api
            .put(\`\${BASE_PATH}/key/\${keyId}?zoneKeyId=\${zoneKeyId}\`)
            .set(CREATED_ON_HEADER, createdOn)
            .send({
              key: '71CA52F757D7C0B45A16C6C04EAFD704',
              checkValue: '4F35C4',
            })
            .expect(StatusCodes.NO_CONTENT)
            .expect(ETAG_HEADER, '1')
            .expect((res) => verifyTemporalHeaders(res, createdOn));
        `,
      output: `
          const createdOn = new Date().toISOString();
          const zoneKeyId = uuid();

          // Import Key
          const keyId = uuid();
          const keyPutResponse = await fetch(\`\${BASE_PATH}/key/\${keyId}?zoneKeyId=\${zoneKeyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              key: '71CA52F757D7C0B45A16C6C04EAFD704',
              checkValue: '4F35C4',
            }),
            headers: {
              [CREATED_ON_HEADER]: createdOn,
            },
          });
          assert.equal(keyPutResponse.status, StatusCodes.NO_CONTENT);
          assert.equal(keyPutResponse.headers.get(ETAG_HEADER), '1');
          assert.doesNotThrow(()=>verifyTemporalHeaders(keyPutResponse, createdOn));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'in arrow function without concurrent promises',
      code: `
          const delayedCardCreationPromise = new Promise((delayedExecution) => {
            setTimeout(() => {
              delayedExecution(fixture.api.put(\`\${BASE_PATH}/card/\${cardId}\`).send(otherTestCard));
            }, 600);
          });
        `,
      output: `
          const delayedCardCreationPromise = new Promise((delayedExecution) => {
            setTimeout(() => {
              delayedExecution(fetch(\`\${BASE_PATH}/card/\${cardId}\`, {
                method: 'PUT',
                body: JSON.stringify(otherTestCard),
              }));
            }, 600);
          });
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assignment statement instead of variable declaration used for subsequent fixture calls',
      code: `
          let response = await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
          response = await fixture.api.get(\`\${BASE_PATH}/ping2\`).expect(StatusCodes.OK);
        `,
      output: `
          let response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          response = await fetch(\`\${BASE_PATH}/ping2\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring',
      code: `
        const { headers: { etag } } = await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      `,
      output: `
        const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        });
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const etag = pingGetResponse.headers.get('etag');
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'nested header destructuring - string literal key with renaming',
      code: `
        const { headers: { 'created-on': createdOn, 'updated-on': updatedOn } } = await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      `,
      output: `
        const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        });
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const createdOn = pingGetResponse.headers.get('created-on');
        const updatedOn = pingGetResponse.headers.get('updated-on');
      `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'support setting headers using object literal',
      code: `function doSomething() {
        return fixture.api
          .get(\`\${BASE_PATH}/ping\`)
          .set({
            ...(options?.createdOn ? { [CREATED_ON_HEADER]: options.createdOn } : {}),
          });
      }`,
      output: `function doSomething() {
        return fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
          headers: {
            ...(options?.createdOn ? { [CREATED_ON_HEADER]: options.createdOn } : {}),
          },
        });
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed',
      code: `async function test() {
        const { statusCode } = await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        });
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const statusCode = pingGetResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'statusCode destructuring should be renamed - with renaming',
      code: `async function test() {
        const { statusCode: pingStatusCode } = await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      }`,
      output: `async function test() {
        const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        });
        assert.equal(pingGetResponse.status, StatusCodes.OK);
        const pingStatusCode = pingGetResponse.status;
      }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
  ],
});
