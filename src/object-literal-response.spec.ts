// object-literal-response.spec.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';
import rule, {
  REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID,
  REQUIRE_OBJECT_LITERAL_FOR_HEADERS_MESSAGE_ID,
  REQUIRE_OBJECT_LITERAL_MESSAGE_ID,
} from './object-literal-response';

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

describe('object-literal-response', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaVersion: 2020, project: true },
    },
  });
  ruleTester.run('object-literal-response', rule, {
    valid: [
      {
        code: RESPONSE_200_OBJECT_LITERAL,
      },
      {
        code: RESPONSE_200_NUMBER_OBJECT_LITERAL,
      },
      {
        code: RESPONSE_200_OBJECT_LITERAL_NOT_USED,
      },
      {
        code: RESPONSE_204_WITHOUT_BODY,
      },
      {
        code: RESPONSE_409_WITHOUT_BODY,
      },
    ],
    invalid: [
      {
        code: OBJECT_LITERAL_NOT_USED_AT_TOP_LEVEL,
        errors: [
          {
            messageId: REQUIRE_OBJECT_LITERAL_MESSAGE_ID,
          },
        ],
      },
      {
        code: RESPONSE_400_OBJECT_LITERAL_NOT_USED,
        errors: [
          {
            messageId: REQUIRE_OBJECT_LITERAL_FOR_ERROR_RESPONSE_MESSAGE_ID,
          },
        ],
      },
      {
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
