// index.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import noEnum from './no-enum';
import noUuid from './no-uuid';
import regexComment from './regular-expression-comment';

export default {
  rules: {
    'file-path-comment': filePathComment,
    'no-card-numbers': noCardNumbers,
    'no-uuid': noUuid,
    'regular-expression-comment': regexComment,
    'no-enum': noEnum,
  },
  configs: {
    all: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'error',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/regular-expression-comment': 'error',
        '@checkdigit/no-enum': 'error',
      },
    },
    recommended: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'off',
        '@checkdigit/no-uuid': 'error',
        '@checkdigit/regular-expression-comment': 'error',
        '@checkdigit/no-enum': 'error',
      },
    },
  },
};
