// no-promise-instance-method.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe } from '@jest/globals';
import rule, {
  NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY,
  NO_PROMISE_INSTANCE_METHOD_THEN,
  ruleId,
} from './no-promise-instance-method';
import createTester from './tester.test';

describe(ruleId, () => {
  createTester().run(ruleId, rule, {
    valid: [
      `await init();`,
      `await Promise.resolve();`,
      `await (new Promise(() => {}))();`,
      `try {
        await init();
      } catch (error) {
        console.error(error);
      } finally {
        console.log('done');
      }`,
    ],
    invalid: [
      {
        code: `// test new Promise instance
        (new Promise(()=>{})()).then(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
          },
        ],
      },
      {
        code: `// test 'then' on async function call
        async function hi() {
          console.log('hi')
        };
        hi().then(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
          },
        ],
      },
      {
        code: `// test 'then' on reference of Promise
        const result = Promise.resolve();
        result.then(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
          },
        ],
      },
      {
        code: `// test static method of Promise
        Promise.all([]).then(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
          },
        ],
      },
      {
        code: `// test external async function call
        fetch("http://example.com").then(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
          },
        ],
      },
      {
        code: `// test '.catch' on async function call
        async function hi() {
          console.log('hi')
        };
        hi().catch(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY,
          },
        ],
      },
      {
        code: `// test '.finally' on async function call
        async function hi() {
          console.log('hi')
        };
        hi().finally(()=>{});`,
        errors: [
          {
            messageId: NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY,
          },
        ],
      },
    ],
  });
});
