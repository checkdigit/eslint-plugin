// object-literal-response.spec.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, {
  REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID,
  REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID,
  REQUIRE_OBJECT_LITERAL_MESSAGE_ID,
  ruleId,
} from './object-literal-response.ts';
import { createEslintRuleTester } from './rule-tester.test.ts';

const RESPONSE_200_OBJECT_LITERAL = `
setResponse(response, {status: StatusCodes.OK, body: {foo: 'bar'}});
`;

const OBJECT_LITERAL_NOT_USED_IN_HEADERS = `
setResponse(response,{
  status: passThroughResponse.status,
  headers: passThroughResponse.headers,
});
  `;

const RESPONSE_200_NUMBER_OBJECT_LITERAL = `
setResponse(response, {status: 200, body: {foo: 'bar'}});
`;

const RESPONSE_200_OBJECT_LITERAL_NOT_USED = `
setResponse(response, {status: StatusCodes.OK, body});
  `;

const RESPONSE_204_WITHOUT_BODY = `
setResponse(response,{
  status: StatusCodes.NO_CONTENT,
  headers: {
    [LAST_MODIFIED_HEADER]: createdOn,
  },
});
  `;

const RESPONSE_409_WITHOUT_BODY = `
setResponse(response,{
  status: StatusCodes.CONFLICT,
});
  `;

const OBJECT_LITERAL_NOT_USED_AT_TOP_LEVEL = `
setResponse(response, responseContext);
  `;

const RESPONSE_400_OBJECT_LITERAL_NOT_USED = `
setResponse(response, {
  status: StatusCodes.BAD_REQUEST,
  body: error,
});
  `;

describe(ruleId, () => {
  const ruleTester = createEslintRuleTester({
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', project: true },
    },
  });

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Valid case with status code enum',
          code: RESPONSE_200_OBJECT_LITERAL,
        },
        {
          name: 'Valid case with status set to a number',
          code: RESPONSE_200_NUMBER_OBJECT_LITERAL,
        },
        {
          name: 'Valid case using property shorthand',
          code: RESPONSE_200_OBJECT_LITERAL_NOT_USED,
        },
        {
          name: 'Valid response without a body',
          code: RESPONSE_204_WITHOUT_BODY,
        },
        {
          name: 'Valid response on an error without a body',
          code: RESPONSE_409_WITHOUT_BODY,
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
          name: 'Object literal not used at top level',
          code: OBJECT_LITERAL_NOT_USED_AT_TOP_LEVEL,
          errors: [
            {
              messageId: REQUIRE_OBJECT_LITERAL_MESSAGE_ID,
            },
          ],
        },
        {
          name: 'Response 400 object literal not used',
          code: RESPONSE_400_OBJECT_LITERAL_NOT_USED,
          errors: [
            {
              messageId: REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID,
            },
          ],
        },
        {
          name: 'Object literal not used in headers',
          code: OBJECT_LITERAL_NOT_USED_IN_HEADERS,
          errors: [
            {
              messageId: REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID,
            },
          ],
        },
      ],
    });
  });
});
