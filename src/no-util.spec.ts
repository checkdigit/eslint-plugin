// no-util.spec.ts

/*
 * Copyright (c) 2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule, { ruleId } from './no-util.ts';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run(ruleId, rule, {
  valid: [
    {
      name: 'Valid case with hello.ts',
      code: `test`,
      filename: 'hello.ts',
    },
    {
      name: 'Valid case with testUtil.ts',
      code: `test`,
      filename: 'testUtil.ts',
    },
    {
      name: 'Valid case with utilTest.ts',
      code: `test`,
      filename: 'utilTest.ts',
    },
    {
      name: 'Valid case with /src/test-utility.ts',
      code: `test`,
      filename: '/src/test-utility.ts',
    },
    {
      name: 'Valid case with test-utility.ts',
      code: `test`,
      filename: 'test-utility.ts',
    },
  ],
  invalid: [
    {
      name: 'Invalid case with util.ts',
      code: `// lib/util.ts\n import crypto from 'node:crypto';`,
      filename: 'util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with src/util.ts',
      code: `// src/util.ts\n import crypto from 'node:crypto';`,
      filename: 'src/util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util.spec.ts',
      code: `// src/util.spec.ts\n import crypto from 'node:crypto';`,
      filename: '/util.spec.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with util.test.ts',
      code: `// lib/util.test.ts\n import crypto from 'node:crypto';`,
      filename: 'util.test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with util-test.ts',
      code: `// lib/util-test.ts\n import crypto from 'node:crypto';`,
      filename: 'util-test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with test-util.ts',
      code: `// lib/test-util.ts\n import crypto from 'node:crypto';`,
      filename: 'test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/test-Util.ts',
      code: `// util/util.ts\n import crypto from 'node:crypto';`,
      filename: '/util/test-Util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/test-util.ts',
      code: `// lib/util.ts\n import crypto from 'node:crypto';`,
      filename: '/util/test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/util-test.ts',
      code: `// util/util-test.ts\n import crypto from 'node:crypto';`,
      filename: '/util/util-test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/utility-test.ts',
      code: `// util/util.ts\n import crypto from 'node:crypto';`,
      filename: '/util/utility-test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /util/test.ts',
      code: `// util/test.ts\n import crypto from 'node:crypto';`,
      filename: '/util/test.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
    {
      name: 'Invalid case with /src/test-util.ts',
      code: `// src/test-util.ts\n \n \n \n import crypto from 'node:crypto';`,
      filename: '/src/test-util.ts',
      errors: [{ messageId: 'NO_UTIL' }],
    },
  ],
});
