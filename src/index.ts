// index.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

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
        '@checkdigit/no-test-import': 'off',
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
        '@checkdigit/no-test-import': 'off',
      },
    },
  },
};
