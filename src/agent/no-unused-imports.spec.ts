// agent/no-unused-imports.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-unused-imports';
import createTester from '../ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'import not used but not from desired module',
      code: `import { SomeType } from 'some-module';`,
    },
    {
      name: 'import used on top level',
      code: `
        import type { Configuration } from '@checkdigit/serve-runtime';
        let config: Configuration;
      `,
    },
    {
      name: 'multiple imports used on top level',
      code: `
        import { type Configuration, EMPTY_CONTEXT } from '@checkdigit/fixtures';
        let config: Configuration;
        let context: EMPTY_CONTEXT;
      `,
    },
    {
      name: 'import used in function declaration',
      code: `
        import type { Configuration } from '@checkdigit/serve-runtime';
        export default async function(config: Configuration): Promise<void> {
          // do something
        }
      `,
    },
    {
      name: 'import used in nested scope',
      code: `
        import type { Configuration } from '@checkdigit/serve-runtime';
        export default async function(): Promise<void> {
          try {
            let config: Configuration;
          } catch (error) {
            // do something
          } 
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'remove unused import',
      code: `import type { Configuration } from '@checkdigit/serve-runtime';`,
      output: ``,
      errors: [{ messageId: 'removeUnusedImports' }],
    },
    {
      name: 'remove multiple unused imports',
      code: `import type { Configuration, Fixture } from '@checkdigit/fixture';`,
      output: ``,
      errors: [{ messageId: 'removeUnusedImports' }],
    },
    {
      name: 'remove partial unused import - type only',
      code: `
        import type { Configuration, Fixture } from '@checkdigit/fixture';
        let config: Configuration;
      `,
      output: `
        import type { Configuration } from '@checkdigit/fixture';
        let config: Configuration;
      `,
      errors: [{ messageId: 'removeUnusedImports' }],
    },
    {
      name: 'remove partial unused import - mixed type and value',
      code: `
        import { EMPTY_CONTEXT, type Fixture } from '@checkdigit/fixture';
        let fixture: Fixture;
      `,
      output: `
        import { type Fixture } from '@checkdigit/fixture';
        let fixture: Fixture;
      `,
      errors: [{ messageId: 'removeUnusedImports' }],
    },
  ],
});
