// agent/add-url-domain.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './add-base-path-import';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no change if the BASE_PATH const is not used',
      code: `const abc = '';`,
    },
    {
      name: 'no change if the BASE_PATH const is already declared',
      filename: 'src/api/v1/index.ts',
      code: `
        export const BASE_PATH = 'https://ping.checkdigit/ping/v1';
        await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);
      `,
    },
    {
      name: 'do not add missing import of BASE_PATH if api folder can not be determined',
      code: `await fixture.api.get(\`\${BASE_PATH}/ping\`).expect(StatusCodes.OK);`,
    },
  ],
  invalid: [
    {
      name: 'add missing import of BASE_PATH',
      filename: 'src/api/v1/ping.spec.ts',
      code: `
          import { strict as assert } from 'node:assert';
          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
        `,
      output: `
          import { strict as assert } from 'node:assert';
import { BASE_PATH } from './index';

          const response = await fetch(\`\${BASE_PATH}/ping\`, {
            method: 'GET',
          });
          assert.equal(response.status, StatusCodes.OK);
        `,
      errors: [{ messageId: 'addBasePathImport' }],
    },
  ],
});
