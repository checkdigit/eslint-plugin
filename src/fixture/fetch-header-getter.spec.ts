// fixture/no-fixture.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './fetch-header-getter';
import createTester from '../tester.test';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  createTester().run(ruleId, rule, {
    valid: [],
    invalid: [
      {
        name: 'replace the access of headers property using getter instead of direct access',
        code: `async() => {
          const createdOn = new Date().toISOString();
          const keyId = uuid();
          const response = await fetch(\`\${BASE_PATH}/key/\${keyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              checkValue: 'foo',
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
          const response2 = await fetch(\`\${BASE_PATH}/key/\${keyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              checkValue: 'bar',
            }),
            headers: {
              [IF_MATCH_HEADER]: headers1[ETAG_HEADER],
              [CREATED_ON_HEADER]: updatedOn,
            },
          });
          assert.equal(response2.status, StatusCodes.NO_CONTENT);
          const headers2 = response2.headers;
          assert.equal(headers2[ETAG_HEADER], '2');
          assert.ok(verifyTemporalHeaders(response2));
        }`,
        output: `async() => {
          const createdOn = new Date().toISOString();
          const keyId = uuid();
          const response = await fetch(\`\${BASE_PATH}/key/\${keyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              checkValue: 'foo',
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
          const response2 = await fetch(\`\${BASE_PATH}/key/\${keyId}\`, {
            method: 'PUT',
            body: JSON.stringify({
              checkValue: 'bar',
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
        }`,
        errors: 4,
      },
    ],
  });
});
