// ts-tester.test.ts

import { RuleTester } from '@typescript-eslint/rule-tester';

export default function createTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        project: '../tsconfig.json',
        tsconfigRootDir: `${process.cwd()}/ts-init`,
      },
    },
  });
}
