// agent/no-unused-function-argument.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-unused-function-argument';
import createTester from '../ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'all function arguments are used',
      code: `function doSomething(a: string, b: number, c: unknown) { console.log(a,b,c); }`,
    },
  ],
  invalid: [
    {
      name: 'remove unused function arguments - first argument',
      code: `function doSomething(a: string, b: number, c: unknown) { console.log(b,c); }`,
      output: `function doSomething(b: number, c: unknown) { console.log(b,c); }`,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
    {
      name: 'remove unused function arguments - last argument',
      code: `function doSomething(a: string, b: number, c: unknown) { console.log(a,b); }`,
      output: `function doSomething(a: string, b: number) { console.log(a,b); }`,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
    {
      name: 'remove unused function arguments - middle argument',
      code: `
        function doSomething(a: string, b: number, c: unknown) {
          console.log(a,c);
        }
      `,
      output: `
        function doSomething(a: string, c: unknown) {
          console.log(a,c);
        }
      `,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
    {
      name: 'remove unused function arguments - first and second arguments',
      code: `function doSomething(a: string, b: number, c: unknown) { console.log(c); }`,
      output: `function doSomething(c: unknown) { console.log(c); }`,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
    {
      name: 'remove unused function arguments - all arguments',
      code: `function doSomething(a: string, b: number, c: unknown) {}`,
      output: `function doSomething() {}`,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
    {
      name: 'remove unused function arguments - first and last arguments',
      code: `function doSomething(a: string, b: number, c: unknown) { console.log(b); }`,
      output: `function doSomething(b: number) { console.log(b); }`,
      errors: [{ messageId: 'removeUnusedFunctionArguments' }],
    },
  ],
});
