// agent/fetch-response-header-getter-ts.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './fetch-response-header-getter';
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
      name: 'no change for fixture.api.get()',
      code: `
        fixture.api.get('/ping');
      `,
    },
    {
      name: 'no change for non-response object',
      code: `
        const map = new Map();
        map.get('key');

        const headers = new Headers();
        headers.get('etag');
      `,
    },
    {
      name: 'no change for request.get()',
      code: `
        const request : { headers: Headers } = await getRequest();
        request.get(ETAG);
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
    {
      name: 'no change if get() method is already used - with non-typed fetch',
      code: `
        const response = await fetch(\`https://example.org\`);
        assert.equal(response.headers.get('etag'), '1');
        assert.equal(response.headers.get(ETAG), '1');
      `,
    },
  ],
  invalid: [
    {
      name: 'use get() method to get header value from the headers object if the typing allows.',
      code: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers[ETAG];
      `,
      output: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers.get(ETAG);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'access using string literal',
      code: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers['created-on'];
      `,
      output: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers.get('created-on');
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'access using Template literal',
      code: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers[\`etag\`];
      `,
      output: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        response.headers.get(\`etag\`);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'replace the direct headers property access with getter',
      code: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        assert.equal(response.headers.etag, '1');
      `,
      output: `
        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        assert.equal(response.headers.get('etag'), '1');
      `,
      errors: [{ messageId: 'useGetter' }],
    },
    {
      name: 'still work with status assertion',
      code: `
        import { strict as assert } from 'node:assert';
        import { StatusCodes } from 'http-status-codes';

        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        assert.equal(response.status, StatusCodes.OK);
        assert.equal(response.headers['updated-on'], '1');
        assert.equal(response.headers.etag, '1');
      `,
      output: `
        import { strict as assert } from 'node:assert';
        import { StatusCodes } from 'http-status-codes';

        const response = await fetch('https://openapi-cli.checkdigit/sample/v1/ping');
        assert.equal(response.status, StatusCodes.OK);
        assert.equal(response.headers.get('updated-on'), '1');
        assert.equal(response.headers.get('etag'), '1');
      `,
      errors: [{ messageId: 'useGetter' }, { messageId: 'useGetter' }],
    },
    {
      name: 'work with non-typed fetch',
      code: `
        const response = await fetch(\`https://example.org\`);
        assert.equal(response.headers.etag, '1');
        assert.equal(response.headers['etag'], '1');
        assert.equal(response.headers[ETAG], '1');
      `,
      output: `
        const response = await fetch(\`https://example.org\`);
        assert.equal(response.headers.get('etag'), '1');
        assert.equal(response.headers.get('etag'), '1');
        assert.equal(response.headers.get(ETAG), '1');
      `,
      errors: [{ messageId: 'useGetter' }, { messageId: 'useGetter' }, { messageId: 'useGetter' }],
    },
    {
      name: 'response.get() should be changed to response.headers.get()',
      code: `
        const response : { headers: Headers } = await getResponse();
        response.get(ETAG);
      `,
      output: `
        const response : { headers: Headers } = await getResponse();
        response.headers.get(ETAG);
      `,
      errors: [{ messageId: 'useGetter' }],
    },
  ],
});
