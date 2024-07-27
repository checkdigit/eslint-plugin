// no-fixture.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-fixture-headers';
import createTester from './tester.test';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  createTester().run(ruleId, rule, {
    valid: [],
    invalid: [
      {
        name: 'callback assertion using arrow function that accesses to response might conflict with the new/redefined response variable',
        code: `
          it.each(temporalHeaders)(
            'import Key with $createdOnHeaderName header, update key with $createdOnHeaderName header',
            async () => {
              const zoneKeyId = uuid();
              await importTestMultipartZoneKey(fixture, zoneKeyId);
              const createdOn = new Date().toISOString();

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
              const headers1 = response.headers;
              assert.equal(headers1.get(ETAG_HEADER), '1');
              assert.equal(response.headers.get(ETAG_HEADER), '1');
              assert.equal(response.headers[ETAG_HEADER], '1');
              assert.equal(response.headers.etag, '1');
              assert.ok(verifyTemporalHeaders(response));

              const updatedOn = new Date().toISOString();
              const response2 = await fetch(\`\${BASE_PATH}/key/\${keyId}?zoneKeyId=\${zoneKeyId}\`, {
                method: 'PUT',
                body: JSON.stringify({
                  key: '339923C206BA8B19EEBF995DEE6619F7',
                  checkValue: '1ADEE9',
                }),
                headers: {
                  [IF_MATCH_HEADER]: headers1[ETAG_HEADER],
                  [CREATED_ON_HEADER]: updatedOn,
                },
              });
              assert.equal(response2.status, StatusCodes.NO_CONTENT);
              const headers2 = response2.headers;
              assert.equal(headers2.get(ETAG_HEADER), '2');
              assert.ok(verifyTemporalHeaders(response2));

              // assert.ok(headers2[UPDATED_ON_HEADER] > headers1[CREATED_ON_HEADER]);
              // assert.ok(headers2.get(UPDATED_ON_HEADER) > headers1.get(CREATED_ON_HEADER));
            },
          );
        `,
        output: `
          it.each(temporalHeaders)(
            'import Key with $createdOnHeaderName header, update key with $createdOnHeaderName header',
            async () => {
              const zoneKeyId = uuid();
              await importTestMultipartZoneKey(fixture, zoneKeyId);
              const createdOn = new Date().toISOString();

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
              const headers1 = response.headers;
              assert.equal(headers1.get(ETAG_HEADER), '1');
              assert.equal(response.headers.get(ETAG_HEADER), '1');
              assert.equal(response.headers.get(ETAG_HEADER), '1');
              assert.equal(response.headers.get('etag'), '1');
              assert.ok(verifyTemporalHeaders(response));

              const updatedOn = new Date().toISOString();
              const response2 = await fetch(\`\${BASE_PATH}/key/\${keyId}?zoneKeyId=\${zoneKeyId}\`, {
                method: 'PUT',
                body: JSON.stringify({
                  key: '339923C206BA8B19EEBF995DEE6619F7',
                  checkValue: '1ADEE9',
                }),
                headers: {
                  [IF_MATCH_HEADER]: headers1.get(ETAG_HEADER),
                  [CREATED_ON_HEADER]: updatedOn,
                },
              });
              assert.equal(response2.status, StatusCodes.NO_CONTENT);
              const headers2 = response2.headers;
              assert.equal(headers2.get(ETAG_HEADER), '2');
              assert.ok(verifyTemporalHeaders(response2));

              // assert.ok(headers2[UPDATED_ON_HEADER] > headers1[CREATED_ON_HEADER]);
              // assert.ok(headers2.get(UPDATED_ON_HEADER) > headers1.get(CREATED_ON_HEADER));
            },
          );
        `,
        errors: 2,
        only: true,
      },
    ],
  });
});
