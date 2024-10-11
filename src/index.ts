// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import { name, version } from '../package.json';
import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify';
import noFullResponse, { ruleId as noFullResponseRuleId } from './agent/no-full-response';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method';
import requireResolveFullResponse, {
  ruleId as requireResolveFullResponseRuleId,
} from './require-resolve-full-response';
import requireTypeOutOfTypeOnlyImports, {
  ruleId as requireTypeOutOfTypeOnlyImportsRuleId,
} from './require-type-out-of-type-only-imports';
import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import noTestImport from './no-test-import';
import noUuid from './no-uuid';
import noWallabyComment from './no-wallaby-comment';
import objectLiteralResponse from './object-literal-response';
import regexComment from './regular-expression-comment';
import requireAssertPredicateRejectsThrows from './require-assert-predicate-rejects-throws';
import requireStrictAssert from './require-strict-assert';

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  'file-path-comment': filePathComment,
  'no-card-numbers': noCardNumbers,
  'no-uuid': noUuid,
  'require-strict-assert': requireStrictAssert,
  'no-test-import': noTestImport,
  'no-wallaby-comment': noWallabyComment,
  'regular-expression-comment': regexComment,
  'require-assert-predicate-rejects-throws': requireAssertPredicateRejectsThrows,
  'object-literal-response': objectLiteralResponse,
  [invalidJsonStringifyRuleId]: invalidJsonStringify,
  [noPromiseInstanceMethodRuleId]: noPromiseInstanceMethod,
  [noFullResponseRuleId]: noFullResponse,
  [requireResolveFullResponseRuleId]: requireResolveFullResponse,
  [requireTypeOutOfTypeOnlyImportsRuleId]: requireTypeOutOfTypeOnlyImports,
};

const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name,
    version,
  },
  rules,
};

const configs: Record<string, TSESLint.FlatConfig.Config> = {
  all: {
    plugins: {
      '@checkdigit': plugin,
    },
    rules: {
      '@checkdigit/no-card-numbers': 'error',
      '@checkdigit/file-path-comment': 'error',
      '@checkdigit/no-uuid': 'error',
      '@checkdigit/require-strict-assert': 'error',
      '@checkdigit/no-wallaby-comment': 'error',
      '@checkdigit/regular-expression-comment': 'error',
      '@checkdigit/require-assert-predicate-rejects-throws': 'error',
      '@checkdigit/object-literal-response': 'error',
      '@checkdigit/no-test-import': 'error',
      [`@checkdigit/${invalidJsonStringifyRuleId}`]: 'error',
      [`@checkdigit/${noPromiseInstanceMethodRuleId}`]: 'error',
      [`@checkdigit/${noFullResponseRuleId}`]: 'error',
      [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'error',
      [`@checkdigit/${requireTypeOutOfTypeOnlyImportsRuleId}`]: 'error',
    },
  },
  recommended: {
    plugins: {
      '@checkdigit': plugin,
    },
    rules: {
      '@checkdigit/no-card-numbers': 'error',
      '@checkdigit/file-path-comment': 'off',
      '@checkdigit/no-uuid': 'error',
      '@checkdigit/require-strict-assert': 'error',
      '@checkdigit/no-wallaby-comment': 'off',
      '@checkdigit/regular-expression-comment': 'error',
      '@checkdigit/require-assert-predicate-rejects-throws': 'error',
      '@checkdigit/object-literal-response': 'error',
      '@checkdigit/no-test-import': 'error',
      [`@checkdigit/${invalidJsonStringifyRuleId}`]: 'error',
      [`@checkdigit/${noPromiseInstanceMethodRuleId}`]: 'error',
    },
  },
};

export default {
  ...plugin,
  configs,
};
