// agent/no-fixture.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './no-fixture';

createTester().run(ruleId, rule, {
  valid: [],
  invalid: [
    {
      name: 'concurrent fixture calls inside Promise.all() - without assertions',
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
      name: 'concurrent fixture calls inside Promise.all() - with assertions',
      code: `const responses = await Promise.all([
        fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK),
        fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK),
      ]);`,
      output: `const responses = await Promise.all([
        fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        })
        .expect(StatusCodes.OK),
        fetch(\`\${BASE_PATH}/ping\`, {
          method: 'GET',
        })
        .expect(StatusCodes.OK),
      ]);`,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion with variable declaration',
      code: `
          const pingResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        `,
      output: `
          const pingResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(StatusCodes.OK);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration',
      code: `
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(StatusCodes.OK);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assertion without variable declaration - complex status assertion argument',
      code: `
          await fixture.api.get(\`/sample-service/v1/ping\`).expect(options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(options.expectedStatusCode ?? StatusCodes.CREATED);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'PUT with request body',
      code: `
          await fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`).send(cardCreationData).expect(StatusCodes.BAD_REQUEST);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
            method: 'PUT',
            body: JSON.stringify(cardCreationData),
          })
          .expect(StatusCodes.BAD_REQUEST);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
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
          })
          .expect(StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'set request header with "!" (non-null assertion operator)',
      code: `
          const noFraudResponse = await fixture.api
            .post(\`\${BASE_PATH}/ping\`)
            .set(IF_MATCH_HEADER, originalCard.version!)
            .set('x-y-z', headers[ETAG]!)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          const noFraudResponse = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'POST',
            headers: {
              [IF_MATCH_HEADER]: originalCard.version!,
              'x-y-z': headers[ETAG]!,
            },
          })
          .expect(StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'POST without request header/body',
      code: `
          await fixture.api
            .post(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'POST',
          })
          .expect(StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'replace del with DELETE',
      code: `
          await fixture.api
            .del(\`/sample-service/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
            .expect(StatusCodes.NO_CONTENT);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
            method: 'DELETE',
          })
          .expect(StatusCodes.NO_CONTENT);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'multiple fixture calls in the same test',
      code: `
          async function test() {
            await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
            const pingGetResponse = await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
            await fixture.api.get(\`/sample-service/v1/ping?param=xxx\`).expect(StatusCodes.OK).expect({message:'pong'});
            await fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
          }
        `,
      output: `
          async function test() {
            await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            })
            .expect(StatusCodes.OK);
            const pingGetResponse = await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            })
            .expect(StatusCodes.OK);
            await fetch(\`\${BASE_PATH}/ping?param=xxx\`, {
              method: 'GET',
            })
            .expect(StatusCodes.OK)
            .expect({message:'pong'});
            await fetch(\`\${BASE_PATH}/ping\`, {
              method: 'GET',
            })
            .expect(StatusCodes.OK);
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
        () => {
          return fixture.api.get(\`/sample-service/v1/ping\`);
        }`,
      output: `
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
        async () => {
          return fixture.api.get(\`/sample-service/v1/ping\`).expect(StatusCodes.OK);
        }`,
      output: `
        async () => {
          return fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(StatusCodes.OK);
        }`,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'directly return (no await) fixture call with body/headers',
      code: `
        () => {
          return fixture.api.put(\`/sample-service/v2/card/\${uuid()}\`)
            .set(IF_MATCH_HEADER, originalCard.version)
            .send({});
        }`,
      output: `
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
      name: 'work with response status literal (e.g. 200 instead of StatusCoodes.OK) as well',
      code: `
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200);
        `,
      output: `
          await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(200);
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'assert response body against function call\'s return value ".expect(validateBody(response))"',
      code: `
          await fixture.api.get(\`/sample-service/v2/ping\`).expect(200).expect(validateBody(createdOn));
        `,
      output: `
          await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          })
          .expect(200)
          .expect(validateBody(createdOn));
        `,
      errors: [{ messageId: 'preferNativeFetch' }],
    },
    {
      name: 'inline access to response body should be extracted to a variable',
      code: `
        export async function validatePin(
          fixture,
        ) {
          const publicKeyGetResponse = (await fixture.api.get(\`\${BASE_PATH}/public-key\`).expect(StatusCodes.OK)).body.publicKey;
        }
        `,
      output: `
        export async function validatePin(
          fixture,
        ) {
          const publicKeyGetResponse = (await fetch(\`\${BASE_PATH}/public-key\`, {
            method: 'GET',
          })
          .expect(StatusCodes.OK)).body.publicKey;
        }
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
  ],
});
