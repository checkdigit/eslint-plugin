// fixture/no-mapped-response-type.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-mapped-response';
import { RuleTester } from '@typescript-eslint/rule-tester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: `${process.cwd()}/ts-init`,
  },
});

ruleTester.run(ruleId, rule, {
  valid: [],
  invalid: [
    {
      name: 'import statement',
      code: `import type { MappedResponse } from '../../../services';`,
      output: `import type { FetchResponse } from '../../../services';`,
      errors: [{ messageId: 'replaceFullResponseWithFetchResponse' }],
    },
    {
      name: 'import statement with multiple imports',
      code: `import type { apiV1, MappedResponse, xxx } from '../../../services';`,
      output: `import type { apiV1, FetchResponse, xxx } from '../../../services';`,
      errors: [{ messageId: 'replaceFullResponseWithFetchResponse' }],
    },
    {
      name: 'import statement mixing type and value imports',
      code: `import { type apiV1, type MappedResponse, xxx } from '../../../services';`,
      output: `import { type apiV1, type FetchResponse, xxx } from '../../../services';`,
      errors: [{ messageId: 'replaceFullResponseWithFetchResponse' }],
    },
    {
      name: 'function return type',
      code: `
        export async function getSensitiveInformation(): Promise<MappedResponse<cardInformation.CardInformationKeyPutResponseContext>> {
          return;
        }
      `,
      output: `
        export async function getSensitiveInformation(): Promise<FetchResponse<cardInformation.CardInformationKeyPutResponseContext>> {
          return;
        }
      `,
      errors: [{ messageId: 'replaceFullResponseWithFetchResponse' }],
    },
    {
      name: 'type casting',
      code: `const fullResponse = response as MappedResponse<unknown>;`,
      output: `const fullResponse = response as FetchResponse<unknown>;`,
      errors: [{ messageId: 'replaceFullResponseWithFetchResponse' }],
    },
  ],
});
