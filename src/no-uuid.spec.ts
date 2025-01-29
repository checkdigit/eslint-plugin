// no-uuid.spec.ts

/*
 * Copyright (c) 2022-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';
import { describe } from '@jest/globals';

import rule from './no-uuid.ts';

const UUID_FOUND = 'UUID_FOUND';
const UUIDS_FOUND = 'UUIDS_FOUND';

const UUID_FOUND_MSG = {
  messageId: UUID_FOUND,
};

const UUIDS_FOUND_MSG = {
  messageId: UUIDS_FOUND,
};

const STRING_TEST = `
const NOT_A_UUID = "I'm not a uuid, I think";
`;

// eslint-disable-next-line no-template-curly-in-string
const TEMPLATE_TEST = "const NOT_A_UUID = `A template that isn't a uuid. ${1+1} = 2`";

const STRING_WITH_NON_UUID = `
  const foo = 'C73BCDCC-2669-4Bf6-XXX-81d3-E4AE73FB11FD';
`;

const CONTAINS_UUID_IN_STRING = `
const foo = 'c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd';
`;

const CONTAINS_MULTIPLE_UUIDS_IN_STRING = `
const foo = 'c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd aa 123e4567-e89b-12d3-a456-426655440000';
`;

const CONTAINS_UUID_IN_COMMENT = `
// this test will be using this uuid -> C73BCDCC-2669-4Bf6-81d3-E4AE73FB11FD
const foo = 'nothing wrong here';
`;

const CONTAINS_MULTIPLE_UUIDS_IN_COMMENT = `
// this test will be using these uuids -> c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd and 123e4567-e89b-12d3-a456-426655440000
const foo = 'nothing wrong here';
`;

describe('no-uuid', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaVersion: 2020 },
    },
  });
  ruleTester.run('no-uuid', rule, {
    valid: [
      {
        code: STRING_TEST,
      },
      {
        code: TEMPLATE_TEST,
      },
      {
        code: STRING_WITH_NON_UUID,
      },
    ],
    invalid: [
      {
        code: CONTAINS_UUID_IN_STRING,
        errors: [UUID_FOUND_MSG],
      },
      {
        code: CONTAINS_MULTIPLE_UUIDS_IN_STRING,
        errors: [UUIDS_FOUND_MSG],
      },
      {
        code: CONTAINS_UUID_IN_COMMENT,
        errors: [UUID_FOUND_MSG],
      },
      {
        code: CONTAINS_MULTIPLE_UUIDS_IN_COMMENT,
        errors: [UUIDS_FOUND_MSG],
      },
    ],
  });
});
