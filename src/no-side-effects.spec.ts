// no-side-effects.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-side-effects';
import createTester from './ts-tester.test';

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
      options: [{ excludedIdentifiers: ['assert', 'debug', 'log'] }],
      name: 'Valid case with no side effects',
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
      errors: [{ messageId: 'NO_SIDE_EFFECTS' }],
      options: [{ excludedIdentifiers: ['assert', 'debug', 'log'] }],
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

                const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
                server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
                
                await new Promise((resolve) => {
                  server.on('listening', resolve);
                });`,
      errors: [
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
        { messageId: 'NO_SIDE_EFFECTS' },
      ],
      options: [{ excludedIdentifiers: ['assert', 'debug', 'log', 'Symbol.for'] }],
      name: 'Invalid case with multiple side effects including server creation and async operations',
    },
  ],
});
