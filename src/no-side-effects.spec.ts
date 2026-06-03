// no-side-effects.spec.ts

/*
 * Copyright (c) 2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-side-effects.ts';
import createTester from './ts-tester.test.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      code: `import { strict as assert } from 'node:assert';
             import debug from 'debug';
             import Koa from 'koa';
             import { v4 as uuid } from 'uuid';
             import Router from '@koa/router';
             import { StatusCodes } from 'http-status-codes';`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with imports only',
    },
    {
      code: `const log = debug('report:event');
             const reportName = 'TEST_REPORT';
             type records = Record;
             interface Report {
                reportName: string;
                report: [];
             }`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with variable declarations and types',
    },
    {
      code: `async function* test() {
               throw new Error('should not be called');
             }
             test();`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with async function and call',
    },
    {
      code: `function createS3ObjectKey(
                from: string,
                to: string,
                bin: string,
                reportId: string,
                createdAt = new Date().toISOString(),
              ): string {
                const prefix = formatUtc(createdAt, 'yyyy/MM/dd/HH');
                return prefix;
              }`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with function declaration',
    },
    {
      code: `import { strict as assert } from 'node:assert';
             assert(\`I'm a number, \${numberValue}\`);
             const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with assertions and schema validation',
    },
    {
      code: `import debug from 'debug';
             import Koa from 'koa';
             import { v4 as uuid } from 'uuid';
             import Router from '@koa/router';
             import { StatusCodes } from 'http-status-codes';`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with imports only',
    },
    {
      code: `const log = debug('report:event');
             Symbol.for('foo');
             const object = { prop: 'foo' };
             Object.freeze(object);`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with Symbol.for and Object.freeze',
    },
    {
      code: `try {
                object.prop = 'bar';
             } catch (error) {
                console.error(error); 
             }
             const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with try-catch and schema validation',
    },
    {
      code: `import debug from 'debug';
             import Koa from 'koa';
             import { v4 as uuid } from 'uuid';
             import Router from '@koa/router';
             import { StatusCodes } from 'http-status-codes';
             const log = debug('report:event');
             Symbol.for('foo');
             const object = { prop: 'foo' };
             Object.freeze(object);
             export default obj;`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with export default',
    },
    {
      code: `const x = 10;
             class MyClass {
               constructor() {}
               static myStaticMethod() {}
               private myPrivateMethod() {}
             }`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with class declaration',
    },
    {
      code: `enum MyEnum {
               A,
               B,
               C
             }
             namespace MyNamespace {
               const value = 42;
             }`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with enum and namespace',
    },
    {
      code: `import { something } from 'somewhere';
             const myExport = 100;
             const myVar: any = null;
             const myBool: boolean = true;
             const myNum: number = 123;
             const myStr: string = 'hello';
             const myVoid: void = undefined;
             const myNull: null = null;
             const myUndefined: undefined = undefined;
             const myObject: object = {};
             const myUnknown: unknown = 'unknown';
             const myTrue: true = true;
             const myFalse: false = false;`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with various variable declarations',
    },
    {
      code: `function genericFunction<T>(arg: T): T {
               return arg;
             }
             module MyModule {
               const moduleValue = 50;
             }`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with function and module',
    },
    {
      code: `const isTypeof = typeof x === 'number';
             const isInstanceof = y instanceof Number;
             const isIn = 'prop' in myObject;`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with type checks',
    },
    {
      code: `declare const myDeclare: string;
             function* myGenerator() {
               yield 1;
             }
             using myResource = { dispose() {} };`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with generator and resource',
    },
    {
      code: `async function fetchData() {
              const data = await fetch('https://api.example.com');
              console.log(data);
            }`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Valid case with async function and await expression',
    },
  ],
  invalid: [
    {
      code: `assert(\`I'm a number, \${numberValue}\`);
           const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);
           export * from './module';`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Invalid case with assertions and schema validation',
    },
    {
      code: `const unresolvedConfiguration = getConfiguration(root());
           const configuration = await service(unresolvedConfiguration);
           const symbol1 = Symbol.for('foo');
           export * from './module';`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationAwaitExpression' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for'] }],
      name: 'Invalid case with variable declarations and async operations',
    },
    {
      code: `export const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
           server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
           await new Promise((resolve) => {
             server.on('listening', resolve);
           });`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationAwaitExpression' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for'] }],
      name: 'Invalid case with server creation and async operations',
    },
    {
      code: `assert.ok(statusCode === StatusCodes.OK, 'Status code is not OK');
           const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
           server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
           export default function myFunction() {
             // function body
           }`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Invalid case with assertions and server creation',
    },
    {
      code: `const object = { prop: 'foo' };
           Object.freeze(object);
           try {
              object.prop = 'bar';
           } catch (error) {
              console.error(error); 
           }
           await new Promise((resolve) => {
             server.on('listening', resolve);
           });
           export default function myFunction() {
             // function body
           }`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationAwaitExpression' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Invalid case with Object.freeze and async operations',
    },
    {
      code: `const x = 10;
           let y = 20;
           var x = 10;
           if (x > y) {
             y = x;
           } else {
             y = 30;
           }
           switch (y) {
             case 10:
               break;
             default:
               return;
           }
           export default function myFunction() {
             // function body
           }`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'NotValidVariableDeclaration' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ControlFlowStatement' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ControlFlowStatement' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ControlFlowStatement' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze', 'memoize'] }],
      name: 'Invalid case with control flow statements',
    },
    {
      code: `import { something } from 'somewhere';
           export const myExport = 100;
           const myVar: any = null;
           const myBool: boolean = true;
           const myNum: number = 123;
           const myStr: string = 'hello';
           const myVoid: void = undefined;
           const myNull: null = null;
           const myUndefined: undefined = undefined;
           const myNever: never = (() => { throw new Error('never'); })();
           const test = newTest();
           const mySymbol: symbol = Symbol('mySymbol');
           const myObject: object = {};
           const myUnknown: unknown = 'unknown';
           const myTrue: true = true;
           const myFalse: false = false;
           export default function myFunction() {
             // function body
           }`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationNewExpression' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
        { messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationCallExpression' } },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze', 'memoize'] }],
      name: 'Invalid case with various variable declarations',
    },
    {
      code: `const isTypeof = typeof x === 'number';
           const isInstanceof = y instanceof Number;
           const isIn = 'prop' in myObject;
           const isNew = new MyClass();
           this.myMethod();
           export default function myFunction() {
             // function body
           }`,
      errors: [{ messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'ExpressionStatementWithSideEffects' } }],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze', 'memoize'] }],
      name: 'Invalid case with type checks and method call',
    },
    {
      code: `declare const myDeclare: string;
           async function myAsyncFunction() {
             await Promise.resolve();
           }
           export const result = await myAsyncFunction();
           async function* test() {
             throw new Error('should not be called');
           }
           function* myGenerator() {
             yield 1;
           }
           using myResource = { dispose() {} };
           const readFile = memoize((name: string) => fs.readFile(name));
           export * from './module';`,
      errors: [{ messageId: 'NO_SIDE_EFFECTS', data: { sideEffectType: 'VariableDeclarationAwaitExpression' } }],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze', 'memoize'] }],
      name: 'Invalid case with async function, generator, and resource',
    },
  ],
});
