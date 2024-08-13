// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import addUrlDomain, { ruleId as addUrlDomainRuleId } from './agent/add-url-domain';
import fetchResponseBodyJson, { ruleId as fetchResponseBodyJsonRuleId } from './agent/fetch-response-body-json';
import fetchResponseHeaderGetter, {
  ruleId as fetchResponseHeaderGetterRuleId,
} from './agent/fetch-response-header-getter';
import fetchThen, { ruleId as fetchThenRuleId } from './agent/fetch-then';
import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify';
import noFixture, { ruleId as noFixtureRuleId } from './agent/no-fixture';
import noFullResponse, { ruleId as noFullResponseRuleId } from './agent/no-full-response';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method';
import noServiceWrapper, { ruleId as noServiceWrapperRuleId } from './agent/no-service-wrapper';
import noStatusCode, { ruleId as noStatusCodeRuleId } from './agent/no-status-code';
import requireResolveFullResponse, {
  ruleId as requireResolveFullResponseRuleId,
} from './require-resolve-full-response';
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
    [fetchThenRuleId]: fetchThen,
    [noServiceWrapperRuleId]: noServiceWrapper,
    [noStatusCodeRuleId]: noStatusCode,
    [fetchResponseBodyJsonRuleId]: fetchResponseBodyJson,
    [fetchResponseHeaderGetterRuleId]: fetchResponseHeaderGetter,
    [addUrlDomainRuleId]: addUrlDomain,
    [noFullResponseRuleId]: noFullResponse,
    [requireResolveFullResponseRuleId]: requireResolveFullResponse,
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
        [`@checkdigit/${noFullResponseRuleId}`]: 'error',
        [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'error',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'off',
        [`@checkdigit/${noFixtureRuleId}`]: 'off',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'off',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'off',
        [`@checkdigit/${fetchThenRuleId}`]: 'off',
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
    'agent-serve-runtime': {
      ignorePatterns: ['*.spec.ts', '*.test.ts'],
      rules: {
        [`@checkdigit/${noFullResponseRuleId}`]: 'error',
        [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'error',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'error',
        [`@checkdigit/${noFixtureRuleId}`]: 'off',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
      },
    },
    'agent-fixture': {
      rules: {
        [`@checkdigit/${noFullResponseRuleId}`]: 'error',
        [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'error',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'error',
        [`@checkdigit/${noFixtureRuleId}`]: 'error',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
      },
    },
  },
};
