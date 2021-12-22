// pure-functions.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { RuleTester } from 'eslint';

import rule from './pure-functions';

const ONLY_PURE_FUNCTIONS = `
const a = 3;
let d = 4;

function x() {
  const a = 3;
  let d = 4;
  return 3;
}

function y() {
  const a = 3;
  let d = 4;
  function z() {
    return 123;
  }
  return z();
}
`;

const RECURSIVE_PURE_FUNCTIONS = `
function x(y) {
  return x(y + 1);
}
x(0);
`;

const IMPURE_FUNCTIONS = `
const a = 3;
let d = 4;
var e = 5;
function b() {
  const c = 2;
  return a + c + d + e;
}
`;

// const IMPURE_FUNCTIONS_OUT_OF_ORDER = `
// const a = 3;
// let d = 4;
// function b() {
//   const c = 2;
//   return a + c + d + e;
// }
// var e = 5;
// `;

describe('pure-functions', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

  ruleTester.run('functions', rule, {
    valid: [
      {
        code: ONLY_PURE_FUNCTIONS,
        parserOptions: {
          project: './tsconfig.json',
        },
      },
      {
        code: RECURSIVE_PURE_FUNCTIONS,
        filename: 'src/hello.ts',
        parserOptions: {
          project: './tsconfig.json',
        },
      },
    ],
    invalid: [
      {
        code: IMPURE_FUNCTIONS,
        errors: [
          {
            message: 'invalid closure over d',
          },
          {
            message: 'invalid closure over e',
          },
        ],
      },
    ],
  });
});
