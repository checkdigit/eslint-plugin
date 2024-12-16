// require-ts-extension-imports.spec.ts

import rule, { ruleId } from './require-ts-extension-imports.ts';
import createTester from './ts-tester.test.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      code: `import foo from './bar.ts';`,
      name: 'Valid case with importing a file with .ts extension',
    },
    {
      code: `import foo from './bar-dir/index.ts';`,
      name: 'Valid case with importing a file with .ts extension in directory',
    },
    {
      code: `import { StatusCodes } from 'http-status-codes';`,
      name: 'Valid case with importing a package',
    },
    {
      code: `import type { ping } from '../../../services/index.ts';`,
      name: 'correctly import service typing',
    },
  ],
  invalid: [
    {
      code: `import foo from './bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from './bar.ts';`,
      name: 'Invalid case with importing a file without .ts extension',
    },
    {
      code: `import foo from '../src/bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from '../src/bar.ts';`,
      name: 'Import without .ts extension in relative path',
    },
    {
      code: `import type { ping } from '../../../services';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import type { ping } from '../../../services/index.ts';`,
      name: 'Invalid import service typing',
    },
  ],
});
