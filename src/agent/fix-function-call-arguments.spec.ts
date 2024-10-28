// agent/fix-function-call-arguments.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { type FixFunctionCallArgumentsRuleOptions, ruleId } from './fix-function-call-arguments';

const testOptions: FixFunctionCallArgumentsRuleOptions = { typesToCheck: ['string', 'number', 'object'] };
createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'correct function call',
      options: [testOptions],
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        const param1: string = 'abc';
        const param2: number = 2;
        doSomething(param1, param2);
      `,
    },
    {
      name: 'regular node library call should not be affected',
      options: [testOptions],
      code: `Buffer.from('some data', 'base64')`,
    },
    {
      name: 'regular node assertion call should not be affected',
      options: [testOptions],
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
      options: [testOptions],
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        const param1: number = 1;
        const param2: string = 'abc';
        const param3: number = 2;
        doSomething(param1, param2, param3);
      `,
      output: `
        function doSomething(id:string, count:number) {
          // do something
        };
        const param1: number = 1;
        const param2: string = 'abc';
        const param3: number = 2;
        doSomething(param2, param3);
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - handle the ending comma',
      options: [testOptions],
      code: `
        function doSomething(id:string, count:number) {
          // do something
        };
        const param1: number = 1;
        doSomething(param1,);
      `,
      output: `
        function doSomething(id:string, count:number) {
          // do something
        };
        const param1: number = 1;
        doSomething();
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - original function has no arguments',
      options: [testOptions],
      code: `
        function doSomething() {
          // do something
        };
        const param1: number = 1;
        doSomething(param1);
      `,
      output: `
        function doSomething() {
          // do something
        };
        const param1: number = 1;
        doSomething();
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
    {
      name: 'remove incompatible function arguments - original function has less arguments',
      options: [testOptions],
      code: `
        function doSomething(id: string) {
          // do something
        };
        const param1: number = 1;
        const param2: string = 'abc';
        const param3: number = 2;
        doSomething(param1, param2, param3);
      `,
      output: `
        function doSomething(id: string) {
          // do something
        };
        const param1: number = 1;
        const param2: string = 'abc';
        const param3: number = 2;
        doSomething(param2);
      `,
      errors: [{ messageId: 'removeIncompatibleFunctionArguments' }],
    },
  ],
});
