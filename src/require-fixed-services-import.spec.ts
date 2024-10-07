// require-fixed-services-import.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './require-fixed-services-import';
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
      name: 'correctly import service typing',
      code: `import type { Ping } from '../../services';`,
    },
  ],
  invalid: [
    {
      name: 'update service typing import from',
      code: `import type { personV1 as person } from '../../services/person';`,
      output: `import type { personV1 as person } from '../../services';`,
      errors: [{ messageId: 'updateServicesImportFrom' }],
    },
    {
      name: 'update service typing import from - with deeper path',
      code: `import type { personV1 as person } from '../../services/person/v1';`,
      output: `import type { personV1 as person } from '../../services';`,
      errors: [{ messageId: 'updateServicesImportFrom' }],
    },
  ],
});
