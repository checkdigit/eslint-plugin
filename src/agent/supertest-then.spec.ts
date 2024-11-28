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
      name: 'skip regular supertest calls which will be handled in "no-expect-assertion" rule',
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
