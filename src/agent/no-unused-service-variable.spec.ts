// agent/no-unused-service-variable.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './no-unused-service-variable';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'used service variable',
      code: `
        function doSomething() {
          const someService = fixture.config.service.xxx(EMPTY_CONTEXT);
          await someService.doSomething();
        }
      `,
    },
    {
      name: 'non-service variable',
      code: `
        function doSomething() {
          const notService = stuff;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'remove unused service variable',
      code: `function doSomething() {
          const someService = fixture.config.service.xxx(EMPTY_CONTEXT);
      }`,
      output: `function doSomething() {
          
      }`,
      errors: [{ messageId: 'removeUnusedServiceVariables' }],
    },
  ],
});
