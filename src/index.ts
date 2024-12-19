// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import invalidJsonStringify, { ruleId as invalidJsonStringifyRuleId } from './invalid-json-stringify.ts';
import noDuplicatedImports, { ruleId as noDuplicatedImportsRuleId } from './no-duplicated-imports.ts';
import noLegacyServiceTyping, { ruleId as noLegacyServiceTypingRuleId } from './no-legacy-service-typing.ts';
import noPromiseInstanceMethod, { ruleId as noPromiseInstanceMethodRuleId } from './no-promise-instance-method.ts';
import noStatusCodeAssert from "./no-status-code-assert.ts";
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
import filePathComment from './file-path-comment.ts';
import noCardNumbers from './no-card-numbers.ts';
import noSideEffects from './no-side-effects.ts';
import noRandomV4UUID from './no-random-v4-uuid.ts';
import noTestImport from './no-test-import.ts';
import noUuid from './no-uuid.ts';
import noWallabyComment from './no-wallaby-comment.ts';
import objectLiteralResponse from './object-literal-response.ts';
import regexComment from './regular-expression-comment.ts';
import requireAssertPredicateRejectsThrows from './require-assert-predicate-rejects-throws.ts';
import requireStrictAssert from './require-strict-assert.ts';
import requireTsExtensionImports from './require-ts-extension-imports';

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  'file-path-comment': filePathComment,
  'no-card-numbers': noCardNumbers,
  'no-random-v4-uuid': noRandomV4UUID,
  'no-status-code-assert': noStatusCodeAssert,
  'no-uuid': noUuid,
  'require-strict-assert': requireStrictAssert,
  'require-ts-extension-imports': requireTsExtensionImports,
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
  [requireFixedServicesImportRuleId]: requireFixedServicesImport,
  [requireTypeOutOfTypeOnlyImportsRuleId]: requireTypeOutOfTypeOnlyImports,
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
        '@checkdigit/no-status-code-assert': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/require-ts-extension-imports': 'error',
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
        '@checkdigit/no-status-code-assert': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/require-strict-assert': 'error',
        '@checkdigit/require-ts-extension-imports': 'error',
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
