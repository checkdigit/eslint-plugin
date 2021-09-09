// index.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import filePathComment from './file-path-comment';
import noCardNumbers from './no-card-numbers';

export const rules = {
  'file-path-comment': filePathComment,
  'no-card-numbers': noCardNumbers,
};
