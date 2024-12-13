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
  ],
  invalid: [],
});
