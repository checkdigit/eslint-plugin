import { promises as fs } from 'node:fs';

import ts from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import noSecrets from 'eslint-plugin-no-secrets';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

const ignores = [
  ...(await fs.readFile('.gitignore', 'utf-8'))
    .split('\n')
    .filter((path) => path.trim() !== ''),
  'eslint.config.mjs',
  'ts-init/**/*',
];

export default [
  { ignores },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.all,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  prettier,
  eslintPlugin.configs.recommended,
  {
    plugins: {
      'no-only-tests': noOnlyTests,
      'no-secrets': noSecrets,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      'sort-keys': 'off',
      'capitalized-comments': 'off',
      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: true,
        },
      ],
      'no-negated-condition': 'off',
      'multiline-comment-style': 'off',
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2, 10, 16, 60],
        },
      ],
      'no-ternary': 'off',
      'max-params': ['error', 8],
      'max-statements': 'off',
      'consistent-return': 'off',
      'no-undef': 'off',
      'init-declarations': 'off',
      'no-inline-comments': 'off',
      'line-comment-position': 'off',
      'prefer-destructuring': 'off',
      'no-useless-return': 'off',
      complexity: 'off',
      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'id-length': [
        'error',
        {
          properties: 'never',
          exceptions: ['_'],
        },
      ],
      'no-plusplus': 'off',
      'default-case': 'off',
      'no-continue': 'off',
      'callback-return': ['error', ['callback', 'cb']],
      'new-cap': [
        'error',
        {
          capIsNew: false,
        },
      ],
      'dot-notation': 'off',
      'no-undefined': 'off',
      'one-var': ['error', 'never'],
      'max-lines-per-function': ['error', 200],
      'sonarjs/cognitive-complexity': ['error', 24],
      'no-only-tests/no-only-tests': 'error',
      curly: 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-magic-numbers': 'off',
      'no-undefined': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'max-lines': 'off',
      'no-await-in-loop': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            {
              from: 'package',
              name: [
                'after',
                'afterEach',
                'before',
                'beforeEach',
                'describe',
                'describe.only',
                'describe.skip',
                'describe.todo',
                'it',
                'it.only',
                'it.skip',
                'it.todo',
                'suite',
                'suite.only',
                'suite.skip',
                'suite.todo',
                'test',
                'test.only',
                'test.skip',
                'test.todo',
              ],
              package: 'node:test',
            },
          ],
        },
      ],
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
];
