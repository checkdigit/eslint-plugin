// no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-fixture';
import createTester from './tester.test';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  createTester().run(ruleId, rule, {
    valid: [],
    invalid: [
      {
        // no assertion
        code: `
          it('GET /ping', async () => {
            await fixture.api.get(\`/smartdata/v1/ping\`);
          });
        `,
        output: `
          it('GET /ping', async () => {
            await fetch(\`\${BASE_PATH}/ping\`);
          });
        `,
        errors: 1,
      },
      {
        // assertion with variable declaration
        code: `
          it('GET /ping', async () => {
            const pingResponse = await fixture.api.get(\`/smartdata/v1/ping\`).expect(StatusCodes.OK);
            const body = pingResponse.body;
            const timeDifference = Date.now() - new Date(body.serverTime).getTime();
            assert.ok(timeDifference >= 0 && timeDifference < 200);
          });
        `,
        output: `
          it('GET /ping', async () => {
            const pingResponse = await fetch(\`\${BASE_PATH}/ping\`);
            assert.equal(pingResponse.status, StatusCodes.OK);
            const body = await pingResponse.json();
            const timeDifference = Date.now() - new Date(body.serverTime).getTime();
            assert.ok(timeDifference >= 0 && timeDifference < 200);
          });
        `,
        errors: 1,
      },
      {
        // assertion without variable declaration
        code: `
          it('GET /ping', async () => {
            await fixture.api.get(\`/smartdata/v1/ping\`).expect(StatusCodes.OK);
          });
        `,
        output: `
          it('GET /ping', async () => {
            const response = await fetch(\`\${BASE_PATH}/ping\`);
            assert.equal(response.status, StatusCodes.OK);
          });
        `,
        errors: 1,
      },
      {
        // PUT with request body
        code: `
          it('PUT /card', async () => {
            await fixture.api.put(\`/vault/v2/card/\${uuid()}\`).send(cardCreationData).expect(StatusCodes.BAD_REQUEST);
          });
        `,
        output: `
          it('PUT /card', async () => {
            const response = await fetch(\`\${BASE_PATH}/card/\${uuid()}\`, {
              method: 'PUT',
              body: JSON.stringify(cardCreationData),
            });
            assert.equal(response.status, StatusCodes.BAD_REQUEST);
          });
        `,
        errors: 1,
      },
      {
        // PUT with request header
        code: `
          it('PUT /card/:cardId/block', async () => {
            const noFraudResponse = await fixture.api
              .post(\`/vault/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
              .set(IF_MATCH_HEADER, originalCard.version)
              .set('abc', originalCard.name)
              .set('x-y-z', '123')
              .expect(StatusCodes.NO_CONTENT);
          });
        `,
        output: `
          it('PUT /card/:cardId/block', async () => {
            const noFraudResponse = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
              method: 'POST',
              headers: {
                [IF_MATCH_HEADER]: originalCard.version,
                abc: originalCard.name,
                'x-y-z': '123',
              },
            });
            assert.equal(noFraudResponse.status, StatusCodes.NO_CONTENT);
          });
        `,
        errors: 1,
      },
      {
        // POST without request header/body
        code: `
          it('PUT /card/:cardId/block', async () => {
            await fixture.api
              .post(\`/vault/v2/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`)
              .expect(StatusCodes.NO_CONTENT);
          });
        `,
        output: `
          it('PUT /card/:cardId/block', async () => {
            const response = await fetch(\`\${BASE_PATH}/card/\${originalCard.card.cardId}/block/\${encodeURIComponent('BLOCKED NO FRAUD')}\`, {
              method: 'POST',
            });
            assert.equal(response.status, StatusCodes.NO_CONTENT);
          });
        `,
        errors: 1,
      },
    ],
  });
});
