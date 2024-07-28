// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import concurrentPromises, { ruleId as concurrentPromisesRuleId } from './fixture/concurrent-promises';
import fetchHeaderGetter, { ruleId as fetchHeaderGetterRuleId } from './fixture/fetch-header-getter';
import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify';
import noFixture, { ruleId as noFixtureRuleId } from './fixture/no-fixture';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method';
import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import noTestImport from './no-test-import';
import noUuid from './no-uuid';
import noWallabyComment from './no-wallaby-comment';
import objectLiteralResponse from './object-literal-response';
import regexComment from './regular-expression-comment';
import requireAssertPredicateRejectsThrows from './require-assert-predicate-rejects-throws';
import requireStrictAssert from './require-strict-assert';

export default {
  rules: {
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
    [noFixtureRuleId]: noFixture,
    [fetchHeaderGetterRuleId]: fetchHeaderGetter,
    [concurrentPromisesRuleId]: concurrentPromises,
  },
  configs: {
    all: {
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
        [`@checkdigit/${noFixtureRuleId}`]: 'error',
        [`@checkdigit/${fetchHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${concurrentPromisesRuleId}`]: 'error',
      },
    },
    recommended: {
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
  },
};
