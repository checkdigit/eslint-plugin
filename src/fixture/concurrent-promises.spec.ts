// fixture/concurrent-promises.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './concurrent-promises';
import createTester from '../tester.test';
import { describe } from '@jest/globals';

describe(ruleId, () => {
  createTester().run(ruleId, rule, {
    valid: [],
    invalid: [
      {
        name: 'assertion with variable declaration',
        code: `
          const responses = await Promise.all([
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData).expect(StatusCodes.NO_CONTENT),
            fixture.api.put(\`\${BASE_PATH}/key\`).send(keyData).expect(StatusCodes.NO_CONTENT),
          ]);
        `,
        output: `
          const responses = await Promise.all([
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            fetch(\`\${BASE_PATH}/key\`, {
              method: 'PUT',
              body: JSON.stringify(keyData),
            }).then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
            // eslint-disable-next-line @checkdigit/no-promise-instance-method
            fetch(\`\${BASE_PATH}/key\`, {
              method: 'PUT',
              body: JSON.stringify(keyData),
            }).then((res) => {
              assert.equal(res.status, StatusCodes.NO_CONTENT);
              return res;
            }),
          ]);
        `,
        errors: 2,
      },
    ],
  });
});
