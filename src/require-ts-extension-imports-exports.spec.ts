// require-ts-extension-imports-exports.spec.ts

import type { PathLike, Stats } from 'fs';
import { jest } from '@jest/globals';

type StatSyncFn = (path: PathLike) => Stats;

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(
      (path) =>
        typeof path === 'string' &&
        (path.endsWith('bar') ||
          path.endsWith('src/bar') ||
          path.endsWith('bar-dir') ||
          path.endsWith('services') ||
          path.endsWith('.test')),
    ),
    statSync: jest.fn<StatSyncFn>().mockImplementation(((path) => ({
      isDirectory: () => typeof path === 'string' && (path.endsWith('bar-dir') || path.endsWith('services')),
    })) as StatSyncFn),
  },
}));

const { default: rule, ruleId } = await import('./require-ts-extension-imports-exports.ts');
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
    {
      code: `export { foo } from './bar.ts';`,
      name: 'Valid case with exporting a file with .ts extension',
    },
    {
      code: `export { foo } from './bar-dir/index.ts';`,
      name: 'Valid case with exporting a file with .ts extension in directory',
    },
    {
      code: `export { StatusCodes } from 'http-status-codes';`,
      name: 'Valid case with exporting from a package',
    },
    {
      code: `export type { ping } from '../../../services/index.ts';`,
      name: 'Correctly export service typing',
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
      code: `import foo from './bar-dir';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from './bar-dir/index.ts';`,
      name: 'Import without .ts extension in directory',
    },
    {
      code: `import foo from '../bar-dir';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import foo from '../bar-dir/index.ts';`,
      name: 'Import without .ts extension in relative path in directory',
    },
    {
      code: `import type { ping } from '../../../services';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import type { ping } from '../../../services/index.ts';`,
      name: 'Invalid import typing from directory without .ts extension',
    },
    {
      code: `import { bar, foo, foo1 } from './test/bar.test';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-IMPORTS' }],
      output: `import { bar, foo, foo1 } from './test/bar.test.ts';`,
      name: 'Invalid import typing from test file without .ts extension',
    },
    {
      code: `export { foo } from './bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export { foo } from './bar.ts';`,
      name: 'Invalid case with exporting a file without .ts extension',
    },
    {
      code: `export { foo } from '../src/bar';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export { foo } from '../src/bar.ts';`,
      name: 'Export without .ts extension in relative path',
    },
    {
      code: `export { foo } from './bar-dir';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export { foo } from './bar-dir/index.ts';`,
      name: 'Export without .ts extension in directory',
    },
    {
      code: `export { foo } from '../bar-dir';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export { foo } from '../bar-dir/index.ts';`,
      name: 'Export without .ts extension in relative path in directory',
    },
    {
      code: `export type { ping } from '../../../services';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export type { ping } from '../../../services/index.ts';`,
      name: 'Invalid export typing from directory without .ts extension',
    },
    {
      code: `export { bar, foo, foo1 } from './test/bar.test';`,
      errors: [{ messageId: 'REQUIRE-TS-EXTENSION-EXPORTS' }],
      output: `export { bar, foo, foo1 } from './test/bar.test.ts';`,
      name: 'Invalid export typing from test file without .ts extension',
    },
  ],
});
