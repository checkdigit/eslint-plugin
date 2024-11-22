// agent/supertest-then.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './supertest-then';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'skip regular supertest calls which will be handled in "no-supertest" rule',
      code: `
          const pingResponse = ping().expect(StatusCodes.OK);
          const body = pingResponse.body;
          const timeDifference = Date.now() - new Date(body.serverTime).getTime();
          assert.ok(timeDifference >= 0 && timeDifference < 200);
        `,
    },
  ],
  invalid: [
    {
      name: 'with assertions',
      code: `
          const responses = await Promise.all([
            ping().expect(StatusCodes.NO_CONTENT),
            ping().expect(StatusCodes.NO_CONTENT),
          ]);
        `,
      output: `
          const responses = await Promise.all([
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            ping().then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            ping().then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
          ]);
        `,
      errors: [{ messageId: 'preferNativeFetch' }, { messageId: 'preferNativeFetch' }],
    },
    // {
    //   name: 'adjust header access correctly',
    //   code: `
    //       const responses = await Promise.all([
    //         ping().expect(StatusCodes.NO_CONTENT),
    //         ping().expect(StatusCodes.NO_CONTENT),
    //       ]);
    //       assert.deepEqual(responses.map((response) => response.headers.etag).sort(), ['1', '1']);
    //       assert.equal(responses[0].headers[LAST_MODIFIED_HEADER], responses[1].headers[LAST_MODIFIED_HEADER]);
    //       assert.equal(responses[0].get(CREATED_ON_HEADER), responses[1].get(CREATED_ON_HEADER));
    //       assert.equal(responses[0].headers.get(UPDATED_ON_HEADER), responses[1].headers.get(UPDATED_ON_HEADER));
    //     `,
    //   output: `
    //       const responses = await Promise.all([
    //         // eslint-disable-next-line @checkdigit/no-promise-instance-method
    //         ping().then((res) => {
    //           assert.equal(res.status, StatusCodes.NO_CONTENT);
    //           return res;
    //         }),
    //         // eslint-disable-next-line @checkdigit/no-promise-instance-method
    //         ping().then((res) => {
    //           assert.equal(res.status, StatusCodes.NO_CONTENT);
    //           return res;
    //         }),
    //       ]);
    //       assert.deepEqual(responses.map((response) => response.headers.get('etag')).sort(), ['1', '1']);
    //       assert.equal(responses[0].headers.get(LAST_MODIFIED_HEADER), responses[1].headers.get(LAST_MODIFIED_HEADER));
    //       assert.equal(responses[0].headers.get(CREATED_ON_HEADER), responses[1].headers.get(CREATED_ON_HEADER));
    //       assert.equal(responses[0].headers.get(UPDATED_ON_HEADER), responses[1].headers.get(UPDATED_ON_HEADER));
    //     `,
    //   errors: [
    //     { messageId: 'preferNativeFetch' },
    //     { messageId: 'preferNativeFetch' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //     { messageId: 'shouldUseHeaderGetter' },
    //   ],
    // },
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
                ping().expect(StatusCodes.BAD_REQUEST)
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
                ping().then((res) => {
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