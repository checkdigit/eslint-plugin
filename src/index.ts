// index.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';
import pureFunctions from './pure-functions';

export default {
  rules: {
    'file-path-comment': filePathComment,
    'no-card-numbers': noCardNumbers,
    'pure-functions': pureFunctions,
  },
  configs: {
    all: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'error',
        '@checkdigit/pure-functions': 'error',
      },
    },
    recommended: {
      rules: {
        '@checkdigit/no-card-numbers': 'error',
        '@checkdigit/file-path-comment': 'off',
        '@checkdigit/pure-functions': 'off',
      },
    },
  },
};
