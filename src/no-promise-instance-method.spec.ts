// no-promise-instance-method.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, {
  NO_PROMISE_INSTANCE_METHOD_CATCH_FINALLY,
  NO_PROMISE_INSTANCE_METHOD_THEN,
  ruleId,
} from './no-promise-instance-method.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Valid await statement',
          code: `await init();`,
        },
        {
          name: 'Valid promise await',
          code: `await Promise.resolve();`,
        },
        {
          name: 'Valid await on a nested promise',
          code: `await (new Promise(() => {}))();`,
        },
        {
          name: 'Valid await on promises nested within try-catch-finally block',
          code: `try {
        await init();
      } catch (error) {
        console.error(error);
      } finally {
        console.log('done');
      }`,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code and provides the correct error message', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: '.then callback on a Promise',
          code: `// test new Promise instance
        (new Promise(()=>{})()).then(()=>{});`,
          errors: [
            {
              messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
            },
          ],
        },
        {
          name: '.then callback on an async function',
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
          name: '.then callback on a non-awaited promise',
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
          name: 'Un-awaited Promise',
          code: `// test static method of Promise
        Promise.all([]).then(()=>{});`,
          errors: [
            {
              messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
            },
          ],
        },
        {
          name: '.then callback on a fetch function call that returns a Promise',
          code: `// test external async function call
        fetch("http://example.com").then(()=>{});`,
          errors: [
            {
              messageId: NO_PROMISE_INSTANCE_METHOD_THEN,
            },
          ],
        },
        {
          name: '.catch callback on an async function',
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
          name: '.finally callback on an async function',
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
});
