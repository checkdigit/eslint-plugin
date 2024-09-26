// agent/fix-function-call-arguments.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './fix-function-call-arguments';
import createTester from '../ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'correct function call',
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        doSomething('abc', 1);
      `,
    },
    {
      name: 'regular node library call should not be affected',
      code: `Buffer.from('some data', 'base64')`,
    },
    {
      name: 'regular node assertion call should not be affected',
      code: `
        import { strict as assert } from 'node:assert';
        const valueA = 'abc';
        assert.equal(valueA, 'abc');
      `,
    },
  ],
  invalid: [
    {
      name: 'remove incompatible function arguments',
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        doSomething({}, 'abc', 1);
      `,
      output: `
        function doSomething(id:string, count:number) {
          // do something
        };
        doSomething('abc', 1);
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - handle the ending comma',
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        doSomething({},);
      `,
      output: `
        function doSomething(id:string, count:number) {
          // do something
        };
        doSomething();
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - original function has no arguments',
      code: `
        function doSomething() {
          // do something
        };
        doSomething({},'abc', 1);
      `,
      output: `
        function doSomething() {
          // do something
        };
        doSomething();
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - original function has less arguments',
      code: `
        function doSomething(id: string) {
          // do something
        };
        doSomething({},'abc', 1);
      `,
      output: `
        function doSomething(id: string) {
          // do something
        };
        doSomething('abc', 1);
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
  ],
});
