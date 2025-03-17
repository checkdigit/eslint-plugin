// no-side-effects.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
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
               import { StatusCodes } from 'http-status-codes';    
               
               const log = debug('report:event');

               const reportName = 'TEST_REPORT';

               type records = Record;
               
               interface Report {
                  reportName: string;
                  report: [];
               }
               
              async function* test() {
                throw new Error('should not be called');
              }
             
              test();
              
              function createS3ObjectKey(
                from: string,
                to: string,
                bin: string,
                reportId: string,
                createdAt = new Date().toISOString(),
              ): string {
                // YYYY/MM/DD/HH
                const prefix = formatUtc(createdAt, 'yyyy/MM/dd/HH');
                return prefix;
              }`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with no side effects',
    },
    {
      code: `import { strict as assert } from 'node:assert';
               import debug from 'debug';
               import Koa from 'koa';
               import { v4 as uuid } from 'uuid';
               import Router from '@koa/router';
               import { StatusCodes } from 'http-status-codes';    
               
               const log = debug('report:event');
              
               const reportName = 'TEST_REPORT';

               type records = Record;
               
               interface Report {
                  reportName: string;
                  report: [];
               }
               
               function createS3ObjectKey(
                from: string,
                to: string,
                bin: string,
                reportId: string,
                createdAt = new Date().toISOString(),
              ): string {
                // YYYY/MM/DD/HH
                const prefix = formatUtc(createdAt, 'yyyy/MM/dd/HH');
                return prefix;
              }
              assert(\`I'm a number, \${numberValue}\`);
              const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);`,
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Valid case with no exports with assertions and schema validation',
    },
    {
      code: `
           import debug from 'debug';
           import Koa from 'koa';
           import { v4 as uuid } from 'uuid';
           import Router from '@koa/router';
           import { StatusCodes } from 'http-status-codes';    
           
           const log = debug('report:event');
          
            Symbol.for('foo');
            const object = {
                  prop: 'foo'
            };
              
            Object.freeze(object);
            
            try {
                object.prop = 'bar';
            } catch (error) {
                console.error(error); 
            }
            const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'valid case with export',
    },
    {
      code: `
             import debug from 'debug';
             import Koa from 'koa';
             import { v4 as uuid } from 'uuid';
             import Router from '@koa/router';
             import { StatusCodes } from 'http-status-codes';    
             
             const log = debug('report:event');
             Symbol.for('foo');
             const object = {
                prop: 'foo'
             };
                
             Object.freeze(object);
                
             export default obj;`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'valid case with object.freeze and Symbol.for',
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
       
        class MyClass {
          constructor() {}
          static myStaticMethod() {}
          private myPrivateMethod() {}
        }
       
        enum MyEnum {
          A,
          B,
          C
        }
        namespace MyNamespace {
          const value = 42;
        }
        import { something } from 'somewhere';
        const myExport = 100;
        const myVar: any = null;
        const myBool: boolean = true;
        const myNum: number = 123;
        const myStr: string = 'hello';
        const myVoid: void = undefined;
        const myNull: null = null;
        const myUndefined: undefined = undefined;
        const myNever: never = (() => { throw new Error('never'); })();
        const mySymbol: symbol = Symbol('mySymbol');
        const myObject: object = {};
        const myUnknown: unknown = 'unknown';
        const myTrue: true = true;
        const myFalse: false = false;
        function genericFunction<T>(arg: T): T {
          return arg;
        }
        module MyModule {
          const moduleValue = 50;
        }
        const isTypeof = typeof x === 'number';
        const isInstanceof = y instanceof Number;
        const isIn = 'prop' in myObject;
        const isNew = new MyClass();
        this.myMethod();
        declare const myDeclare: string;
        async function myAsyncFunction() {
          await Promise.resolve();
        }
        function* myGenerator() {
          yield 1;
        }
        using myResource = { dispose() {} };`,
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'valid case with various constructs',
    },
  ],
  invalid: [
    {
      code: `import { strict as assert } from 'node:assert';
               import debug from 'debug';
               import Koa from 'koa';
               import { v4 as uuid } from 'uuid';
               import Router from '@koa/router';
               import { StatusCodes } from 'http-status-codes';    
               
               const log = debug('report:event');
              
               const reportName = 'TEST_REPORT';

               type records = Record;
               
               interface Report {
                  reportName: string;
                  report: [];
               }
               
               export function createS3ObjectKey(
                from: string,
                to: string,
                bin: string,
                reportId: string,
                createdAt = new Date().toISOString(),
              ): string {
                // YYYY/MM/DD/HH
                const prefix = formatUtc(createdAt, 'yyyy/MM/dd/HH');
                return prefix;
              }
              assert(\`I'm a number, \${numberValue}\`);
              const jsonSchemaValidator = new Ajv({ allErrors: true }).compile(schema);`,
      errors: [{ messageId: 'NO_SIDE_EFFECTS' }],
      options: [{ excludedIdentifiers: ['debug', 'log'] }],
      name: 'Invalid case with side effects in assertions and schema validation',
    },
    {
      code: `import { strict as assert } from 'node:assert';
                import http from 'node:http';
                import debug from 'debug';
                
                import { getConfiguration } from 'test';
                                
                const unresolvedConfiguration = getConfiguration(root());
                const configuration = await service(unresolvedConfiguration);
                const symbol1 = Symbol.for('foo');

                export const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
                server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
                
                await new Promise((resolve) => {
                  server.on('listening', resolve);
                });`,
      errors: [{ messageId: 'NO_SIDE_EFFECTS' }, { messageId: 'NO_SIDE_EFFECTS' }],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for'] }],
      name: 'Invalid case with multiple side effects including name export name declaration with server creation and async operations',
    },
    {
      code: `import { strict as assert } from 'node:assert';
                import http from 'node:http';
                import debug from 'debug';
                
                import { getConfiguration } from 'test';
                                
                const unresolvedConfiguration = getConfiguration(root());
                const configuration = await service(unresolvedConfiguration);
                const symbol1 = Symbol.for('foo');
                assert.ok(statusCode === StatusCodes.OK, 'Status code is not OK');
                const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
                server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
                
                export default function myFunction() {
                  // function body
                }
                
                const object = {
                   prop: 'foo'
                };
                
                Object.freeze(object);
                
                try {
                    object.prop = 'bar';
                } catch (error) {
                    console.error(error); 
                }
                await new Promise((resolve) => {
                  server.on('listening', resolve);
                });`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Invalid case with multiple side effects including export default declarations and async operations',
    },
    {
      code: `import { strict as assert } from 'node:assert';
              import http from 'node:http';
              import debug from 'debug';
              
              import { getConfiguration } from 'test';
                              
              const unresolvedConfiguration = getConfiguration(root());
              const configuration = await service(unresolvedConfiguration);
              const symbol1 = Symbol.for('foo');
              
               const object = {
                  prop: 'foo'
              };
             
              assert.ok(statusCode === StatusCodes.OK, 'Status code is not OK');

              Object.freeze(object);
              
              try {
                 object.prop = 'bar';
              } catch (error) {
                  console.error(error); 
              }
              
              Symbol.for('foo');
              export default obj;
              const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
              server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
              
              await new Promise((resolve) => {
                server.on('listening', resolve);
              });
              export * from './module';`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'Invalid case with multiple side effects including export all declarations and async operations with try catch',
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
       
        class MyClass {
          constructor() {}
          static myStaticMethod() {}
          private myPrivateMethod() {}
        }
       
        enum MyEnum {
          A,
          B,
          C
        }
        namespace MyNamespace {
          export const value = 42;
        }
        import { something } from 'somewhere';
        export const myExport = 100;
        const myVar: any = null;
        const myBool: boolean = true;
        const myNum: number = 123;
        const myStr: string = 'hello';
        const myVoid: void = undefined;
        const myNull: null = null;
        const myUndefined: undefined = undefined;
        const myNever: never = (() => { throw new Error('never'); })();
        const mySymbol: symbol = Symbol('mySymbol');
        const myObject: object = {};
        const myUnknown: unknown = 'unknown';
        const myTrue: true = true;
        const myFalse: false = false;
        function genericFunction<T>(arg: T): T {
          return arg;
        }
        module MyModule {
          export const moduleValue = 50;
        }
        const isTypeof = typeof x === 'number';
        const isInstanceof = y instanceof Number;
        const isIn = 'prop' in myObject;
        const isNew = new MyClass();
        this.myMethod();
        declare const myDeclare: string;
        async function myAsyncFunction() {
          await Promise.resolve();
        }
        function* myGenerator() {
          yield 1;
        }
        using myResource = { dispose() {} };`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
      ],
      options: [{ excludedIdentifiers: ['debug', 'log', 'Symbol.for', 'Object.freeze'] }],
      name: 'InValid case with various constructs',
    },
  ],
});
