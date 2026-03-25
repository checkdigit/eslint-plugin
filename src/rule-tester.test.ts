// rule-tester.test.ts

import { after, describe, it } from 'node:test';

import { RuleTester as EslintRuleTester, Linter } from 'eslint';
import {
  type RuleTesterConfig,
  RuleTester as TypescriptRuleTester,
} from '@typescript-eslint/rule-tester';

export function createEslintRuleTester(
  configuration: Linter.Config = {
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },
): EslintRuleTester {
  // Not setting node:test functions here for formatting in stdout
  return new EslintRuleTester(configuration);
}

export function createTypescriptRuleTester(
  configuration: RuleTesterConfig = {
    languageOptions: {
      parserOptions: {
        project: '../tsconfig.json',
        tsconfigRootDir: `${process.cwd()}/ts-init`,
      },
    },
  },
): TypescriptRuleTester {
  /* eslint-disable @typescript-eslint/no-misused-promises */
  TypescriptRuleTester.describe = describe;
  TypescriptRuleTester.afterAll = after;
  TypescriptRuleTester.it = it;
  // eslint-disable-next-line no-only-tests/no-only-tests
  TypescriptRuleTester.itOnly = it.only;
  TypescriptRuleTester.describeSkip = describe.skip;
  TypescriptRuleTester.itSkip = it.skip;
  /* eslint-enable @typescript-eslint/no-misused-promises */
  return new TypescriptRuleTester(configuration);
}
