// athena.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'node:assert';

import debug from 'debug';
import { ESLintUtils } from '@typescript-eslint/utils';

import { parse } from './peggy/athena-peggy';

export const ruleId = 'athena';
const SYNTEXT_ERROR = 'SyntextError';
const log = debug('eslint-plugin:athena');
const createRule = ESLintUtils.RuleCreator((name) => name);

const rule: ESLintUtils.RuleModule<typeof SYNTEXT_ERROR> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of `enum` in TypeScript',
    },
    schema: [],
    messages: {
      [SYNTEXT_ERROR]: `SyntextError {{ errorMessage }}`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TemplateLiteral(sqlNode) {
        const sql = sqlNode.quasis[0]?.value.raw.toUpperCase();
        if (sql === undefined || (!sql.startsWith('SELECT ') && !sql.startsWith('WITH '))) {
          return;
        }

        let ast;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ast = parse(sql, { includeLocations: true });
          log(JSON.stringify(ast, undefined, 2));
        } catch (error) {
          context.report({
            node: sqlNode,
            messageId: SYNTEXT_ERROR,
            data: {
              errorMessage: JSON.stringify(error, undefined, 2),
            },
          });
          return;
        }
      },
    };
  },
});

export default rule;
