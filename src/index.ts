// index.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify.ts';
import noDuplicatedImports, { ruleId as noDuplicatedImportsRuleId } from './no-duplicated-imports.ts';
import noLegacyServiceTyping, { ruleId as noLegacyServiceTypingRuleId } from './no-legacy-service-typing.ts';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method.ts';
import noStatusCodeAssert from './no-status-code-assert.ts';
import requireFixedServicesImport, {
  ruleId as requireFixedServicesImportRuleId,
} from './require-fixed-services-import.ts';
import requireResolveFullResponse, {
  ruleId as requireResolveFullResponseRuleId,
} from './require-resolve-full-response.ts';
import requireTypeOutOfTypeOnlyImports, {
  ruleId as requireTypeOutOfTypeOnlyImportsRuleId,
} from './require-type-out-of-type-only-imports.ts';
import noServeRuntime, { ruleId as noServeRuntimeRuleId } from './no-serve-runtime.ts';
import requireServiceCallResponseDeclaration, {
  ruleId as requireServiceCallResponseDeclarationRuleId,
} from './require-service-call-response-declaration.ts';
import requireConsistentRead, { ruleId as requireConsistentReadRuleId } from './aws/require-consistent-read.ts';
import requireAwsConfig, { ruleId as requireAwsConfigRuleId } from './aws/require-aws-config.ts';
import filePathComment from './file-path-comment.ts';
import noCardNumbers from './no-card-numbers.ts';
import noEnum from './no-enum.ts';
import noSideEffects from './no-side-effects.ts';
import noRandomV4UUID from './no-random-v4-uuid.ts';
import noTestImport from './no-test-import.ts';
import noUtil from './no-util.ts';
import noUuid from './no-uuid.ts';
import noWallabyComment from './no-wallaby-comment.ts';
import objectLiteralResponse from './object-literal-response.ts';
import regexComment from './regular-expression-comment.ts';
import requireAssertPredicateRejectsThrows from './require-assert-predicate-rejects-throws.ts';
import requireStrictAssert from './require-strict-assert.ts';
import requireAssertMessage from './require-assert-message';
import requireTsExtensionImportsExports from './require-ts-extension-imports-exports.ts';

export { default as isAwsSdkV3Used } from './aws/is-aws-sdk-v3-used.ts';

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  'file-path-comment': filePathComment,
  'no-card-numbers': noCardNumbers,
  'no-enum': noEnum,
  'no-random-v4-uuid': noRandomV4UUID,
  'no-status-code-assert': noStatusCodeAssert,
  'no-util': noUtil,
  'no-uuid': noUuid,
  'require-assert-message': requireAssertMessage,
  'require-strict-assert': requireStrictAssert,
  'require-ts-extension-imports-exports': requireTsExtensionImportsExports,
  'no-test-import': noTestImport,
  'no-wallaby-comment': noWallabyComment,
  'no-side-effects': noSideEffects,
  'regular-expression-comment': regexComment,
  'require-assert-predicate-rejects-throws': requireAssertPredicateRejectsThrows,
  'object-literal-response': objectLiteralResponse,
  [invalidJsonStringifyRuleId]: invalidJsonStringify,
  [noPromiseInstanceMethodRuleId]: noPromiseInstanceMethod,
  [noLegacyServiceTypingRuleId]: noLegacyServiceTyping,
  [requireResolveFullResponseRuleId]: requireResolveFullResponse,
  [noDuplicatedImportsRuleId]: noDuplicatedImports,
  [noServeRuntimeRuleId]: noServeRuntime,
  [requireServiceCallResponseDeclarationRuleId]: requireServiceCallResponseDeclaration,
  [requireAwsConfigRuleId]: requireAwsConfig,
  [requireFixedServicesImportRuleId]: requireFixedServicesImport,
  [requireTypeOutOfTypeOnlyImportsRuleId]: requireTypeOutOfTypeOnlyImports,
  [requireConsistentReadRuleId]: requireConsistentRead,
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
        '@checkdigit/no-enum': 'error',
        '@checkdigit/file-path-comment': 'error',
        '@checkdigit/no-random-v4-uuid': 'error',
        '@checkdigit/no-status-code-assert': 'error',
        '@checkdigit/no-util': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-assert-message': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/require-ts-extension-imports-exports': 'error',
        '@checkdigit/no-wallaby-comment': 'error',
        '@checkdigit/no-side-effects': 'error',
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
        [`@checkdigit/${requireServiceCallResponseDeclarationRuleId}`]: 'error',
        [`@checkdigit/${requireConsistentReadRuleId}`]: 'error',
        [`@checkdigit/${requireAwsConfigRuleId}`]: 'error',
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
        '@checkdigit/no-enum': 'error',
        '@checkdigit/file-path-comment': 'off',
        '@checkdigit/no-random-v4-uuid': 'error',
        '@checkdigit/no-status-code-assert': 'error',
        '@checkdigit/no-util': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-assert-message': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/require-ts-extension-imports-exports': 'error',
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
        [`@checkdigit/${requireServiceCallResponseDeclarationRuleId}`]: 'off',
        [`@checkdigit/${requireConsistentReadRuleId}`]: 'off',
        [`@checkdigit/${requireAwsConfigRuleId}`]: 'off',
      },
    },
  ],
};

const defaultToExport: Exclude<TSESLint.FlatConfig.Plugin, 'config'> & {
  configs: Record<string, TSESLint.FlatConfig.Config[]>;
} = {
  ...plugin,
  configs,
};
export default defaultToExport;
