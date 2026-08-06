// wallaby.mjs

/*
 * Copyright (c) 2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export default function () {
  return {
    autoDetect: ['node:test'],
    files: ['src/**/*.ts', '!src/**/*.spec.ts'],
    tests: ['src/**/*.spec.ts'],
    env: {
      params: {
        runner: '--experimental-test-module-mocks',
      },
    },
  };
}
