// fixture/fetch-response-header-getter-ts.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './fetch-response-header-getter-ts';
import { RuleTester } from '@typescript-eslint/rule-tester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: `${process.cwd()}/ts-init`,
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'no change if get() method is already used',
      code: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers.get(ETAG);
      `,
    },
    {
      name: 'no change of response.get() if the type of response does not include "headers" property',
      code: `
        const response : Record<string,string> = await getResponse();
        response.get(ETAG);
      `,
    },
    {
      name: 'no change of request.get() if the type the request do not have "headers" property',
      code: `
        type Context = { get: (string)=>string };
        async function doSomething(req: Context) {
          const etagRequestHeader = req.get(ETAG);
        }
      `,
    },
    {
      name: 'no change of request.get() if the variable name is "request"',
      code: `
        type Context = { get: (string)=>string, headers: Record<string,string> };
        async function doSomething(request: Context) {
          const etagRequestHeader = request.get(ETAG);
        }
      `,
    },
    {
      name: 'no change of request.get() if the type the request is InboundContext',
      code: `
        async function doSomething(req: InboundContext) {
          const etagRequestHeader = req.get(ETAG);
        }
      `,
    },
    {
      name: 'no change of request.get() if the type the request is xxxRequestType',
      code: `
        async function doSomething(fooReq: FooRequestType) {
          const etagRequestHeader = fooReq.get(ETAG);
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'use get() method to get header value from the headers object if the typing allows.',
      code: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers[ETAG];
      `,
      output: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers.get(ETAG);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'access using string literal',
      code: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers['created-on'];
      `,
      output: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers.get('created-on');
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'access using Template literal',
      code: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers[\`etag\`];
      `,
      output: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers.get(\`etag\`);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'response.get() should be changed to response.headers.get()',
      code: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.get(ETAG);
      `,
      output: `
        const response : { headers: {get: (string)=>string} } = await getResponse();
        response.headers.get(ETAG);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
  ],
});
