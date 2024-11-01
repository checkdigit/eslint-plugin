// agent/add-url-domain.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './add-base-path-const';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no change if the BASE_PATH const is already declared',
      filename: 'src/api/v1/index.ts',
      code: `import ping from './ping';
      export const BASE_PATH = 'https://ping.checkdigit/ping/v1';`,
    },
  ],
  invalid: [
    {
      name: 'add BASE_PATH const',
      filename: 'src/api/v1/index.ts',
      code: `import ping from './ping';`,
      output: `import ping from './ping';
export const BASE_PATH = 'https://ping.checkdigit/ping/v1';
`,
      errors: [{ messageId: 'addBasePathConst' }],
    },
  ],
});
