// no-side-effects.spec.ts

/*
 * Copyright (c) 2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from '@jest/globals';

import rule from './no-side-effects';

describe('no-side-effects', () => {
  const ruleTester = new RuleTester();
  // @ts-expect-error, workaround for the type definition
  ruleTester.run('no-side-effects', rule, {
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
        filename: 'src/no-side-effects.ts',
        options: [{ excludedIdentifiers: ['assert', 'debug', 'log'] }],
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
        errors: [{ message: 'No side effects can occur at the module-level' }],
        filename: 'src/side-effects.ts',
        options: [{ excludedIdentifiers: ['assert', 'debug', 'log'] }],
      },
      {
        code: `import { strict as assert } from 'node:assert';
                import http from 'node:http';
                import debug from 'debug';
                
                import { getConfiguration } from 'test';
                                
                const unresolvedConfiguration = getConfiguration(root());
                const configuration = await service(unresolvedConfiguration);
               
                const server = http.createServer(logger(configuration.requestHandler, unresolvedConfiguration.name));
                server.listen(Number.parseInt(unresolvedConfiguration.env['PORT'], 10), '0.0.0.0');
                
                await new Promise((resolve) => {
                  server.on('listening', resolve);
                });`,
        errors: [
          { message: 'No side effects can occur at the module-level' },
          { message: 'No side effects can occur at the module-level' },
          { message: 'No side effects can occur at the module-level' },
          { message: 'No side effects can occur at the module-level' },
          { message: 'No side effects can occur at the module-level' },
        ],
        filename: 'local.ts',
        options: [{ excludedIdentifiers: ['assert', 'debug', 'log'] }],
      },
    ],
  });
});
