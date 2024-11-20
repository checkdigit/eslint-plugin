// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import addUrlDomain, { ruleId as addUrlDomainRuleId } from './agent/add-url-domain';
import agentTestWiring, { ruleId as agentTestWiringRuleId } from './agent/agent-test-wiring';
import fetchResponseBodyJson, { ruleId as fetchResponseBodyJsonRuleId } from './agent/fetch-response-body-json';
import fetchResponseHeaderGetter, {
  ruleId as fetchResponseHeaderGetterRuleId,
} from './agent/fetch-response-header-getter';
import fetchResponseStatus, { ruleId as fetchResponseStatusRuleId } from './agent/fetch-response-status';
import fetchThen, { ruleId as fetchThenRuleId } from './agent/fetch-then';
import fixFunctionCallArguments, {
  ruleId as fixFunctionCallArgumentsRuleId,
} from './agent/fix-function-call-arguments';
import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify';
import noDuplicatedImports, { ruleId as noDuplicatedImportsRuleId } from './no-duplicated-imports';
import noFixture, { ruleId as noFixtureRuleId } from './agent/no-fixture';
import noLegacyServiceTyping, { ruleId as noLegacyServiceTypingRuleId } from './no-legacy-service-typing';
import noMappedResponse, { ruleId as noMappedResponseRuleId } from './agent/no-mapped-response';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method';
import noServiceWrapper, { ruleId as noServiceWrapperRuleId } from './agent/no-service-wrapper';
import noStatusCode, { ruleId as noStatusCodeRuleId } from './agent/no-status-code';
import noUnusedFunctionArguments, {
  ruleId as noUnusedFunctionArgumentsRuleId,
} from './agent/no-unused-function-argument';
import noUnusedImports, { ruleId as noUnusedImportsRuleId } from './agent/no-unused-imports';
import noUnusedServiceVariables, { ruleId as noUnusedServiceVariablesRuleId } from './agent/no-unused-service-variable';
import requireFixedServicesImport, {
  ruleId as requireFixedServicesImportRuleId,
} from './require-fixed-services-import';
import requireResolveFullResponse, {
  ruleId as requireResolveFullResponseRuleId,
} from './require-resolve-full-response';
import requireTypeOutOfTypeOnlyImports, {
  ruleId as requireTypeOutOfTypeOnlyImportsRuleId,
} from './require-type-out-of-type-only-imports';
import noServeRuntime, { ruleId as noServeRuntimeRuleId } from './no-serve-runtime';
import addBasePathConst, { ruleId as addBasePathConstRuleId } from './agent/add-base-path-const';
import addBasePathImport, { ruleId as addBasePathImportRuleId } from './agent/add-base-path-import';
import addAssertImport, { ruleId as addAssertImportRuleId } from './agent/add-assert-import';
import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import noSideEffects from './no-side-effects';
import noRandomV4UUID from './no-random-v4-uuid';
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
  'no-random-v4-uuid': noRandomV4UUID,
  'no-uuid': noUuid,
  'require-strict-assert': requireStrictAssert,
  'no-test-import': noTestImport,
  'no-wallaby-comment': noWallabyComment,
  'no-side-effects': noSideEffects,
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
  [fetchResponseStatusRuleId]: fetchResponseStatus,
  [addUrlDomainRuleId]: addUrlDomain,
  [noLegacyServiceTypingRuleId]: noLegacyServiceTyping,
  [noMappedResponseRuleId]: noMappedResponse,
  [requireResolveFullResponseRuleId]: requireResolveFullResponse,
  [noDuplicatedImportsRuleId]: noDuplicatedImports,
  [noServeRuntimeRuleId]: noServeRuntime,
  [addBasePathConstRuleId]: addBasePathConst,
  [addBasePathImportRuleId]: addBasePathImport,
  [addAssertImportRuleId]: addAssertImport,
  [requireFixedServicesImportRuleId]: requireFixedServicesImport,
  [requireTypeOutOfTypeOnlyImportsRuleId]: requireTypeOutOfTypeOnlyImports,
  [noUnusedFunctionArgumentsRuleId]: noUnusedFunctionArguments,
  [noUnusedServiceVariablesRuleId]: noUnusedServiceVariables,
  [noUnusedImportsRuleId]: noUnusedImports,
  [fixFunctionCallArgumentsRuleId]: fixFunctionCallArguments,
  [agentTestWiringRuleId]: agentTestWiring,
};

const plugin: TSESLint.FlatConfig.Plugin = {
  rules,
};

const configs: Record<string, TSESLint.FlatConfig.Config[]> = {
  all: [
    {
      files: ['**/*.ts'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'error',
        '@checkdigit/no-random-v4-uuid': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/no-wallaby-comment': 'error',
        '@checkdigit/no-side-effects': ['error', { excludedIdentifiers: ['assert', 'debug', 'log', 'promisify'] }],
        '@checkdigit/regular-expression-comment': 'error',
        '@checkdigit/require-assert-predicate-rejects-throws': 'error',
        '@checkdigit/object-literal-response': 'error',
        '@checkdigit/no-test-import': 'error',
        [`@checkdigit/${invalidJsonStringifyRuleId}`]: 'error',
        [`@checkdigit/${noPromiseInstanceMethodRuleId}`]: 'error',
        [`@checkdigit/${noLegacyServiceTypingRuleId}`]: 'error',
        [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'error',
        [`@checkdigit/${noDuplicatedImportsRuleId}`]: 'error',
        [`@checkdigit/${requireFixedServicesImportRuleId}`]: 'error',
        [`@checkdigit/${requireTypeOutOfTypeOnlyImportsRuleId}`]: 'error',
        [`@checkdigit/${noServeRuntimeRuleId}`]: 'error',
        // --- agent rules BEGIN ---
        [`@checkdigit/${noMappedResponseRuleId}`]: 'off',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'off',
        [`@checkdigit/${noFixtureRuleId}`]: 'off',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'off',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseStatusRuleId}`]: 'off',
        [`@checkdigit/${fetchThenRuleId}`]: 'off',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'off',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'off',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'off',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'off',
        [`@checkdigit/${agentTestWiringRuleId}`]: 'off',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'off',
        [`@checkdigit/${addBasePathImportRuleId}`]: 'off',
        [`@checkdigit/${addAssertImportRuleId}`]: 'off',
        // --- agent rules END ---
      },
    },
  ],
  recommended: [
    {
      files: ['**/*.ts'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'off',
        '@checkdigit/no-random-v4-uuid': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/no-wallaby-comment': 'off',
        '@checkdigit/no-side-effects': 'error',
        '@checkdigit/regular-expression-comment': 'error',
        '@checkdigit/require-assert-predicate-rejects-throws': 'error',
        '@checkdigit/object-literal-response': 'error',
        '@checkdigit/no-test-import': 'error',
        [`@checkdigit/${invalidJsonStringifyRuleId}`]: 'error',
        [`@checkdigit/${noPromiseInstanceMethodRuleId}`]: 'off',
        [`@checkdigit/${noLegacyServiceTypingRuleId}`]: 'off',
        [`@checkdigit/${requireResolveFullResponseRuleId}`]: 'off',
        [`@checkdigit/${noDuplicatedImportsRuleId}`]: 'error',
        [`@checkdigit/${requireFixedServicesImportRuleId}`]: 'off',
        [`@checkdigit/${requireTypeOutOfTypeOnlyImportsRuleId}`]: 'error',
        [`@checkdigit/${noServeRuntimeRuleId}`]: 'off',
        // --- agent rules BEGIN ---
        [`@checkdigit/${noMappedResponseRuleId}`]: 'off',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'off',
        [`@checkdigit/${noFixtureRuleId}`]: 'off',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'off',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'off',
        [`@checkdigit/${fetchResponseStatusRuleId}`]: 'off',
        [`@checkdigit/${fetchThenRuleId}`]: 'off',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'off',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'off',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'off',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'off',
        [`@checkdigit/${agentTestWiringRuleId}`]: 'off',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'off',
        [`@checkdigit/${addBasePathImportRuleId}`]: 'off',
        [`@checkdigit/${addAssertImportRuleId}`]: 'off',
        // --- agent rules END ---
      },
    },
  ],
  'agent-phase-1-test': [
    {
      files: ['**/*.spec.ts', '**/*.test.ts', 'src/api/v*/index.ts'],
      // eslint-disable-next-line sonarjs/no-duplicate-string
      ignores: ['src/plugin/**'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        [`@checkdigit/${noMappedResponseRuleId}`]: 'error',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'error',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseStatusRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'error',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'error',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'error',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'error',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'error',
        [`@checkdigit/${addBasePathImportRuleId}`]: 'error',
        [`@checkdigit/${addAssertImportRuleId}`]: 'error',
      },
    },
    {
      files: ['**/*.spec.ts'],
      ignores: ['src/plugin/**'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        [`@checkdigit/${agentTestWiringRuleId}`]: 'error',
        [`@checkdigit/${noFixtureRuleId}`]: 'error',
      },
    },
  ],
  'agent-phase-2-production': [
    {
      files: ['**/*.ts'],
      ignores: ['src/plugin/**'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        [`@checkdigit/${noMappedResponseRuleId}`]: 'error',
        [`@checkdigit/${addUrlDomainRuleId}`]: 'error',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseStatusRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'error',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'error',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'error',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'error',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'error',
        [`@checkdigit/${addBasePathImportRuleId}`]: 'error',
        [`@checkdigit/${addAssertImportRuleId}`]: 'error',
      },
    },
  ],
};

const defaultToExport: Exclude<TSESLint.FlatConfig.Plugin, 'config'> & {
  configs: Record<string, TSESLint.FlatConfig.Config | TSESLint.FlatConfig.Config[]>;
} = {
  ...plugin,
  configs,
};
export default defaultToExport;
