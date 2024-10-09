import path from 'node:path';
import { fileURLToPath } from 'node:url';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import _import from 'eslint-plugin-import';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import noSecrets from 'eslint-plugin-no-secrets';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import { fixupPluginRules } from '@eslint/compat';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filename);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const compat = new FlatCompat({
  baseDirectory: __dirname,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  recommendedConfig: js.configs.recommended,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['ts-init/**/*.ts', 'eslint.config.mjs'],
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ...compat.extends(
    'eslint:all',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:eslint-plugin-eslint-plugin/recommended',
    'prettier',
  ),
  sonarjs.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      import: fixupPluginRules(_import),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'no-only-tests': noOnlyTests,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'no-secrets': noSecrets,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'eslint-plugin': eslintPlugin,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',

      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: __dirname,
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
      // eslint-disable-next-line no-magic-numbers
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
      // eslint-disable-next-line no-magic-numbers
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
      'import/order': [
        'error',
        {
          'newlines-between': 'ignore',
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
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
];
