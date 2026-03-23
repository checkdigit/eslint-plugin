// test-setup.ts

/*
 * Copyright (c) 2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as test from 'node:test';

import { RuleTester as ESLintRuleTester } from 'eslint';
import { RuleTester as TypeScriptRuleTester } from '@typescript-eslint/rule-tester';

interface RuleTesterHooks {
  afterAll?: unknown;
  describe: unknown;
  describeSkip?: unknown;
  it: unknown;
  itOnly: unknown;
  itSkip?: unknown;
}

function configureRuleTester(ruleTester: RuleTesterHooks): void {
  ruleTester.afterAll = test.after;
  ruleTester.describe = test.describe;
  ruleTester.describeSkip = test.describe.skip;
  ruleTester.it = test.it;
  // eslint-disable-next-line no-only-tests/no-only-tests
  ruleTester.itOnly = test.it.only;
  ruleTester.itSkip = test.it.skip;
}

configureRuleTester(ESLintRuleTester as unknown as RuleTesterHooks);
configureRuleTester(TypeScriptRuleTester as unknown as RuleTesterHooks);
