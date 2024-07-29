// fixture/no-fixture.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-fixture';
import createTester from '../tester.test';
import { describe } from '@jest/globals';

describe(ruleId, () => {
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
        errors: 2,
      },
      {
        name: 'assertion with variable declaration',
        code: `
          const pingResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          const body = pingResponse.body;
          const timeDifference = Date.now() - new Date(body.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
        output: `
          const pingResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingResponse.status, StatusCodes.OK);
          const body = await pingResponse.json();
          const timeDifference = Date.now() - new Date(body.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
        errors: 1,
      },
      {
        name: 'assertion without variable declaration',
        code: `
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
        `,
        errors: 1,
      },
      {
        name: 'assertion without variable declaration',
        code: `
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
        errors: 1,
      },
      {
        name: 'PUT with request body',
        code: `
          await fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`).send(cardCreationData).expect(StatusCodes.BAD_REQUEST);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
            method: 'PUT',
            body: JSON.stringify(cardCreationData),
          });
          assert.equal(response.status, StatusCodes.BAD_REQUEST);
        `,
        errors: 1,
      },
      {
        name: 'PUT with request header',
        code: `
          const noFraudResponse = await fixture.api
            .post(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .set(IF_MATCH_HEADER, originalCard.version)
            .set('abc', originalCard.name)
            .set('x-y-z', '123')
            .expect(StatusCodes.NO_CONTENT);
        `,
        output: `
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
        errors: 1,
      },
      {
        name: 'POST without request header/body',
        code: `
          await fixture.api
            .post(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .expect(StatusCodes.NO_CONTENT);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'POST',
          });
          assert.equal(response.status, StatusCodes.NO_CONTENT);
        `,
        errors: 1,
      },
      {
        name: 'response headers assertion should be externalized with new variable declared if necessary',
        code: `
          await fixture.api.get(\`/sample-service/v2/ping\`)
            .expect(StatusCodes.OK)
            .expect('etag', '123')
            .expect('content-type', 'application/json')
            .expect(ETAG, correctVersion)
            .expect(ETAG, /1.*/u);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          assert.equal(response.headers.get('etag'), '123');
          assert.equal(response.headers.get('content-type'), 'application/json');
          assert.equal(response.headers.get(ETAG), correctVersion);
          assert.ok(response.headers.get(ETAG).match(/1.*/u));
        `,
        errors: 1,
      },
      {
        name: 'response body assertion',
        code: `
          await fixture.api.get(\`/sample-service/v2/ping\`).expect({message:'pong'});
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.deepEqual(await response.json(), {message:'pong'});
        `,
        errors: 1,
      },
      {
        name: 'response callback assertion',
        code: `
          await fixture.api.get(\`/sample-service/v2/ping\`)
          .expect(validate)
          .expect((response)=>console.log(response));
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.ok(validate(response));
          assert.ok(console.log(response));
        `,
        errors: 1,
      },
      {
        name: 'multiple fixture calls in the same test',
        code: `
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          const pingResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          await fixture.api.get(\`/sample-service/v1/ping?param=xxx\`).expect(StatusCodes.OK).expect({message:'pong'});
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          const pingResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(pingResponse.status, StatusCodes.OK);
          const response2 = await fetch(\`\${BASE_PATH}/ping?param=xxx\`, {
            method: 'GET',
          });
          assert.equal(response2.status, StatusCodes.OK);
          assert.deepEqual(await response2.json(), {message:'pong'});
          const response3 = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response3.status, StatusCodes.OK);
        `,
        errors: 4,
      },
      {
        name: 'directly return (no await) fixture call',
        code: `() => {
          return fixture.api.get(\`/sample-service/v1/ping\`);
        }`,
        output: `() => {
          return fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
        }`,
        errors: 1,
      },
      {
        name: 'directly return (no await) fixture call with assertion',
        code: `async () => {
          return fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        }`,
        output: `async () => {
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          return response;
        }`,
        errors: 1,
      },
      {
        name: 'directly return (no await) fixture call with body/headers',
        code: `() => {
          return fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`)
            .set(IF_MATCH_HEADER, originalCard.version)
            .send({});
        }`,
        output: `() => {
          return fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
            method: 'PUT',
            body: JSON.stringify({}),
            headers: {
              [IF_MATCH_HEADER]: originalCard.version,
            },
          });
        }`,
        errors: 1,
      },
      {
        name: 'replace statusCode with status',
        code: `
          const response = await fixture.api.get(\`/sample-service/v2/ping\`);
          assert.equal(response.statusCode, StatusCodes.OK);
          console.log('status:', response.statusCode);
          const response2 = await fixture.api.get(\`/sample-service/v2/ping\`);
          assert.equal(response2.status, StatusCodes.OK);
        `,
        output: `
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
        errors: 2,
      },
      {
        name: 'replace header access through response.get() with response.headers.get()',
        code: `
          const response = await fixture.api.get(\`/sample-service/v2/ping\`).expect(StatusCodes.OK);
          assert.equal(response.get(ETAG), correctVersion);
          assert.equal(response.get('etag'), correctVersion);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          assert.equal(response.headers.get(ETAG), correctVersion);
          assert.equal(response.headers.get('etag'), correctVersion);
        `,
        errors: 1,
      },
      {
        name: 'work with response status literal (e.g. 200 instead of StatusCoodes.OK) as well',
        code: `
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200);
        `,
        output: `
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, 200);
        `,
        errors: 1,
      },
      {
        name: 'assert response body against function call\'s return value ".expect(validateBody(response))"',
        code: `
          const createdOn = Date.now().toUTCString();
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200).expect(validateBody(createdOn));
        `,
        output: `
          const createdOn = Date.now().toUTCString();
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), validateBody(createdOn));
        `,
        errors: 1,
      },
      {
        name: 'handle destructuring variable declaration for body',
        code: `
          const { body: responseBody } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
        output: `
          const response = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          const responseBody = await response.json();
          const timeDifference = Date.now() - new Date(responseBody.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
        errors: 1,
      },
      {
        name: 'handle destructuring variable declaration for headers when body is presented as well',
        code: `
          const { body, headers: headers2 } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          assert(body);
          assert.ok(headers2.get(ETAG));
        `,
        output: `
          const response = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          const body = await response.json();
          const headers2 = response.headers;
          assert(body);
          assert.ok(headers2.get(ETAG));
        `,
        errors: 1,
      },
      {
        name: 'handle destructuring variable declaration for headers without body presented but with assertions used',
        code: `
          const { headers } = await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          assert.ok(headers.get(ETAG));
        `,
        output: `
          const response = await fetch(\`$\{BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          const headers = response.headers;
          assert.ok(headers.get(ETAG));
        `,
        errors: 1,
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
        errors: 1,
      },
      {
        name: 'avoid response variable name conflict with existing variables in the same scope',
        code: `
          async () => {
            const response = 'foo';
            const response1 = 'bar';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          }
        `,
        output: `
          async () => {
            const response = 'foo';
            const response1 = 'bar';
            const response2 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(response2.status, StatusCodes.OK);
            const response3 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(response3.status, StatusCodes.OK);
          }
        `,
        errors: 2,
      },
      {
        name: 'response variable names in different scope do not conflict with each other',
        code: `
          it('#1', async () => {
            const response = 'foo';
          });
          it('#2', async () => {
            const response = 'foo';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          });
          it('#3', async () => {
            const response3 = 'foo';
            await fixture.api.get(\`$\{BASE_PATH}/ping\`).expect(StatusCodes.OK);
          });
        `,
        output: `
          it('#1', async () => {
            const response = 'foo';
          });
          it('#2', async () => {
            const response = 'foo';
            const response2 = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(response2.status, StatusCodes.OK);
          });
          it('#3', async () => {
            const response3 = 'foo';
            const response = await fetch(\`$\{BASE_PATH}/ping\`, {
              method: 'GET',
            });
            assert.equal(response.status, StatusCodes.OK);
          });
        `,
        errors: 2,
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
          const response = await fetch(\`\${BASE_PATH}/public-key\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
          const responseBody = await response.json();
          const paymentSecurityServicePublicKey = responseBody.publicKey;
        }
        `,
        errors: 1,
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
          const response = await fetch(\`\${BASE_PATH}/key/\${keyId}?zoneKeyId=\${zoneKeyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              key: '71CA52F757D7C0B45A16C6C04EAFD704',
              checkValue: '4F35C4',
            }),
            headers: {
              [CREATED_ON_HEADER]: createdOn,
            },
          });
          assert.equal(response.status, StatusCodes.NO_CONTENT);
          assert.equal(response.headers.get(ETAG_HEADER), '1');
          assert.ok(verifyTemporalHeaders(response, createdOn));
        `,
        errors: 1,
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
        errors: 1,
      },
    ],
  });
});
