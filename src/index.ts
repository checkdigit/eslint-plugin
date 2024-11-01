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
import fetchThen, { ruleId as fetchThenRuleId } from './agent/fetch-then';
import fixFunctionCallArguments, {
  ruleId as fixFunctionCallArgumentsRuleId,
} from './agent/fix-function-call-arguments';
import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify';
import noDuplicatedImports, { ruleId as noDuplicatedImportsRuleId } from './no-duplicated-imports';
import noFixture, { ruleId as noFixtureRuleId } from './agent/no-fixture';
import noFullResponse, { ruleId as noFullResponseRuleId } from './agent/no-full-response';
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
import noServeRuntime, { ruleId as noServeRuntimeRuleId } from './agent/no-serve-runtime';
import addBasePathConst, { ruleId as addBasePathConstRuleId } from './agent/add-base-path-const';
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
  [noFixtureRuleId]: noFixture,
  [fetchThenRuleId]: fetchThen,
  [noServiceWrapperRuleId]: noServiceWrapper,
  [noStatusCodeRuleId]: noStatusCode,
  [fetchResponseBodyJsonRuleId]: fetchResponseBodyJson,
  [fetchResponseHeaderGetterRuleId]: fetchResponseHeaderGetter,
  [addUrlDomainRuleId]: addUrlDomain,
  [noFullResponseRuleId]: noFullResponse,
  [noMappedResponseRuleId]: noMappedResponse,
  [requireResolveFullResponseRuleId]: requireResolveFullResponse,
  [noDuplicatedImportsRuleId]: noDuplicatedImports,
  [noServeRuntimeRuleId]: noServeRuntime,
  [addBasePathConstRuleId]: addBasePathConst,
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

const configs: Record<string, TSESLint.FlatConfig.Config | TSESLint.FlatConfig.Config[]> = {
  all: [
    {
      files: ['**/*.ts'],
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
        [`@checkdigit/${fetchThenRuleId}`]: 'off',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'off',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'off',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'off',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'off',
        [`@checkdigit/${agentTestWiringRuleId}`]: 'off',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'off',
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
        [`@checkdigit/${noFixtureRuleId}`]: 'error',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'error',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'error',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'error',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'error',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'error',
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
        [`@checkdigit/${noFixtureRuleId}`]: 'off',
        [`@checkdigit/${noServiceWrapperRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseBodyJsonRuleId}`]: 'error',
        [`@checkdigit/${fetchResponseHeaderGetterRuleId}`]: 'error',
        [`@checkdigit/${fetchThenRuleId}`]: 'error',
        [`@checkdigit/${noUnusedFunctionArgumentsRuleId}`]: 'error',
        [`@checkdigit/${noUnusedServiceVariablesRuleId}`]: 'error',
        [`@checkdigit/${noUnusedImportsRuleId}`]: 'error',
        [`@checkdigit/${fixFunctionCallArgumentsRuleId}`]: 'error',
        [`@checkdigit/${addBasePathConstRuleId}`]: 'error',
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
