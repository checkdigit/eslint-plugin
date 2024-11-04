// agent/add-url-domain.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './add-assert-import';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no change if the assert is not used',
      code: `const name='abc';`,
    },
    {
      name: 'no change if the assert is used and imported',
      code: `import { strict as assert } from 'node:assert';
      assert(true);`,
    },
    {
      name: 'no change if the assert is used and imported - not using node: prefix in the module name',
      code: `import { strict as assert } from 'assert';
      assert(true);`,
    },
  ],
  invalid: [
    {
      name: 'add assert import if assert is used but not imported',
      code: `assert(true);`,
      output: `import { strict as assert } from 'node:assert';
assert(true);`,
      errors: [{ messageId: 'addAssertImport' }],
    },
    {
      name: 'add assert import if assert is used but not imported - using assert.ok',
      code: `assert.ok(true);`,
      output: `import { strict as assert } from 'node:assert';
assert.ok(true);`,
      errors: [{ messageId: 'addAssertImport' }],
    },
    {
      name: 'add assert import if assert is used but not imported - with first line as comment',
      code: `// api/v1/ping.spec.ts
      assert.ok(true);`,
      output: `// api/v1/ping.spec.ts
      import { strict as assert } from 'node:assert';
assert.ok(true);`,
      errors: [{ messageId: 'addAssertImport' }],
    },
  ],
});
