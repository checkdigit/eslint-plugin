// index.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import noUuid from './no-uuid';
import noWallabyComment from './no-wallaby-comment';
import regexComment from './regular-expression-comment';

export default {
  rules: {
    'file-path-comment': filePathComment,
    'no-card-numbers': noCardNumbers,
    'no-uuid': noUuid,
    'no-wallaby-comment': noWallabyComment,
    'regular-expression-comment': regexComment,
  },
  configs: {
    all: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/no-wallaby-comment': 'error',
        '@checkdigit/regular-expression-comment': 'error',
      },
    },
    recommended: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'off',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/no-wallaby-comment': 'off',
        '@checkdigit/regular-expression-comment': 'error',
      },
    },
  },
};
