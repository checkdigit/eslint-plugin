// require-ts-extension-imports.spec.ts

import rule, { ruleId } from './require-ts-extension-imports.ts';
import createTester from './ts-tester.test.ts';
import { jest } from '@jest/globals';

jest.mock('fs', () => {
  console.log('Applying jest.mock for node:fs');
  return {
    existsSync: jest.fn((path: string) => {
      console.log(`Mock existsSync called with path: ${path}`);
      return path.endsWith('bar') || path.endsWith('src/bar') || path.endsWith('bar-dir');
    }),
    statSync: jest.fn((path: string) => {
      console.log(`Mock statSync called with path: ${path}`);
      if (path.endsWith('bar') || path.endsWith('src/bar')) {
        return { isDirectory: () => false, isFile: () => true };
      }
      if (path.endsWith('bar-dir')) {
        return { isDirectory: () => true, isFile: () => false };
      }
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }),
  };
});


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
    }
  ],
  invalid: [
    {
      code: `import foo from './bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from './bar.ts';`,
      name: 'Invalid case with importing a file without .ts extension',
      only:true
    },
    {
      code: `import foo from '../src/bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from '../src/bar.ts';`,
      name: 'Import without .ts extension in relative path',
    },
    {
      code: `import foo from './bar-dir';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from './bar-dir/index.ts';`,
      name: 'Import without .ts extension in directory',
    },
  ],
});
