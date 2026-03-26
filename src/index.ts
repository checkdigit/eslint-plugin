// index.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import invalidJsonStringify, {
  ruleId as invalidJsonStringifyRuleId,
} from './invalid-json-stringify.ts';
import noDuplicatedImports, {
  ruleId as noDuplicatedImportsRuleId,
} from './no-duplicated-imports.ts';
import noLegacyServiceTyping, {
  ruleId as noLegacyServiceTypingRuleId,
} from './no-legacy-service-typing.ts';
import noPromiseInstanceMethod, {
  ruleId as noPromiseInstanceMethodRuleId,
} from './no-promise-instance-method.ts';
import noStatusCodeAssert, {
  ruleId as noStatusCodeAssertRuleId,
} from './no-status-code-assert.ts';
import requireFixedServicesImport, {
  ruleId as requireFixedServicesImportRuleId,
} from './require-fixed-services-import.ts';
import requireResolveFullResponse, {
  ruleId as requireResolveFullResponseRuleId,
} from './require-resolve-full-response.ts';
import requireTypeOutOfTypeOnlyImports, {
  ruleId as requireTypeOutOfTypeOnlyImportsRuleId,
} from './require-type-out-of-type-only-imports.ts';
import noServeRuntime, {
  ruleId as noServeRuntimeRuleId,
} from './no-serve-runtime.ts';
import requireServiceCallResponseDeclaration, {
  ruleId as requireServiceCallResponseDeclarationRuleId,
} from './require-service-call-response-declaration.ts';
import requireAwsConfig, {
  ruleId as requireAwsConfigRuleId,
} from './aws/require-aws-config.ts';
import requireAWSBareBones, {
  ruleId as requireAWSBareBonesRuleId,
} from './aws/require-aws-bare-bones.ts';
import requireConsistentRead, {
  ruleId as requireConsistentReadRuleId,
} from './aws/require-consistent-read.ts';
import filePathComment, {
  ruleId as filePathCommentRuleId,
} from './file-path-comment.ts';
import noCardNumbers, {
  ruleId as noCardNumbersRuleId,
} from './no-card-numbers.ts';
import noEnum, { ruleId as noEnumRuleId } from './no-enum.ts';
import noSideEffects, {
  ruleId as noSideEffectsRuleId,
} from './no-side-effects.ts';
import noRandomV4UUID, {
  ruleId as noRandomV4UUIDRuleId,
} from './no-random-v4-uuid.ts';
import noTestImport, {
  ruleId as noTestImportRuleId,
} from './no-test-import.ts';
import noUtil, { ruleId as noUtilRuleId } from './no-util.ts';
import noUuid, { ruleId as noUUIDRuleId } from './no-uuid.ts';
import noWallabyComment, {
  ruleId as noWallabyCommentRuleId,
} from './no-wallaby-comment.ts';
import objectLiteralResponse, {
  ruleId as objectLiteralResponseRuleId,
} from './object-literal-response.ts';
import regexComment, {
  ruleId as regularExpressionCommentRuleId,
} from './regular-expression-comment.ts';
import requireAssertPredicateRejectsThrows, {
  ruleId as requireAssertPredicateRejectsThrowsRuleId,
} from './require-assert-predicate-rejects-throws.ts';
import requireStrictAssert, {
  ruleId as requireStrictAssertRuleId,
} from './require-strict-assert.ts';
import requireAssertMessage, {
  ruleId as requireAssertMessageRuleId,
} from './require-assert-message';
import requireTsExtensionImportsExports, {
  ruleId as requireTSExtensionImportsExportsRuleId,
} from './require-ts-extension-imports-exports.ts';

export { default as isAwsSdkV3Used } from './aws/is-aws-sdk-v3-used.ts';

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  [filePathCommentRuleId]: filePathComment,
  [noCardNumbersRuleId]: noCardNumbers,
  [noEnumRuleId]: noEnum,
  [noRandomV4UUIDRuleId]: noRandomV4UUID,
  [noStatusCodeAssertRuleId]: noStatusCodeAssert,
  [noUtilRuleId]: noUtil,
  [noUUIDRuleId]: noUuid,
  [requireAssertMessageRuleId]: requireAssertMessage,
  [requireStrictAssertRuleId]: requireStrictAssert,
  [requireTSExtensionImportsExportsRuleId]: requireTsExtensionImportsExports,
  [noTestImportRuleId]: noTestImport,
  [noWallabyCommentRuleId]: noWallabyComment,
  [noSideEffectsRuleId]: noSideEffects,
  [regularExpressionCommentRuleId]: regexComment,
  [requireAssertPredicateRejectsThrowsRuleId]:
    requireAssertPredicateRejectsThrows,
  [objectLiteralResponseRuleId]: objectLiteralResponse,
  [invalidJsonStringifyRuleId]: invalidJsonStringify,
  [noPromiseInstanceMethodRuleId]: noPromiseInstanceMethod,
  [noLegacyServiceTypingRuleId]: noLegacyServiceTyping,
  [requireResolveFullResponseRuleId]: requireResolveFullResponse,
  [noDuplicatedImportsRuleId]: noDuplicatedImports,
  [noServeRuntimeRuleId]: noServeRuntime,
  [requireServiceCallResponseDeclarationRuleId]:
    requireServiceCallResponseDeclaration,
  [requireAwsConfigRuleId]: requireAwsConfig,
  [requireFixedServicesImportRuleId]: requireFixedServicesImport,
  [requireTypeOutOfTypeOnlyImportsRuleId]: requireTypeOutOfTypeOnlyImports,
  [requireAWSBareBonesRuleId]: requireAWSBareBones,
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
        [`@checkdigit/${noCardNumbersRuleId}`]: 'error',
        [`@checkdigit/${noEnumRuleId}`]: 'error',
        [`@checkdigit/${filePathCommentRuleId}`]: 'error',
        [`@checkdigit/${noRandomV4UUIDRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeAssertRuleId}`]: 'error',
        [`@checkdigit/${noUtilRuleId}`]: 'error',
        [`@checkdigit/${noUUIDRuleId}`]: 'error',
        [`@checkdigit/${requireAssertMessageRuleId}`]: 'error',
        [`@checkdigit/${requireStrictAssertRuleId}`]: 'error',
        [`@checkdigit/${requireTSExtensionImportsExportsRuleId}`]: 'error',
        [`@checkdigit/${noWallabyCommentRuleId}`]: 'error',
        [`@checkdigit/${noSideEffectsRuleId}`]: 'error',
        [`@checkdigit/${regularExpressionCommentRuleId}`]: 'error',
        [`@checkdigit/${requireAssertPredicateRejectsThrowsRuleId}`]: 'error',
        [`@checkdigit/${objectLiteralResponseRuleId}`]: 'error',
        [`@checkdigit/${noTestImportRuleId}`]: 'error',
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
        [`@checkdigit/${requireAWSBareBonesRuleId}`]: 'error',
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
        [`@checkdigit/${noCardNumbersRuleId}`]: 'error',
        [`@checkdigit/${noEnumRuleId}`]: 'error',
        [`@checkdigit/${filePathCommentRuleId}`]: 'error',
        [`@checkdigit/${noRandomV4UUIDRuleId}`]: 'error',
        [`@checkdigit/${noStatusCodeAssertRuleId}`]: 'error',
        [`@checkdigit/${noUtilRuleId}`]: 'error',
        [`@checkdigit/${noUUIDRuleId}`]: 'error',
        [`@checkdigit/${requireAssertMessageRuleId}`]: 'error',
        [`@checkdigit/${requireStrictAssertRuleId}`]: 'error',
        [`@checkdigit/${requireTSExtensionImportsExportsRuleId}`]: 'error',
        [`@checkdigit/${noWallabyCommentRuleId}`]: 'error',
        [`@checkdigit/${noSideEffectsRuleId}`]: 'error',
        [`@checkdigit/${regularExpressionCommentRuleId}`]: 'error',
        [`@checkdigit/${requireAssertPredicateRejectsThrowsRuleId}`]: 'error',
        [`@checkdigit/${objectLiteralResponseRuleId}`]: 'error',
        [`@checkdigit/${noTestImportRuleId}`]: 'error',
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
        [`@checkdigit/${requireAWSBareBonesRuleId}`]: 'off',
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
