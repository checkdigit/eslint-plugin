// agent/add-url-domain.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'add-assert-import';

const ASSERT_IMPORT_STATEMENT = "import { strict as assert } from 'node:assert';";

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'addAssertImport'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Add import of assert module of node.',
    },
    messages: {
      addAssertImport: 'Add import of assert module of node.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let isAssertImported = false;
    let isAssertUsed = false;

    return {
      ImportDeclaration: (node) => {
        if (node.source.value === 'assert' || node.source.value === 'node:assert') {
          isAssertImported = true;
        }
      },
      CallExpression: (callExpression) => {
        // detect if assert is used
        if (
          (callExpression.callee.type === AST_NODE_TYPES.Identifier && callExpression.callee.name === 'assert') ||
          (callExpression.callee.type === AST_NODE_TYPES.MemberExpression &&
            callExpression.callee.object.type === AST_NODE_TYPES.Identifier &&
            callExpression.callee.object.name === 'assert')
        ) {
          isAssertUsed = true;
        }
      },
      'Program:exit': (program) => {
        // add assert import if necessary
        if (isAssertUsed && !isAssertImported) {
          const firstStatement = program.body[0];
          assert(firstStatement);
          context.report({
            node: program,
            messageId: 'addAssertImport',
            fix(fixer) {
              return fixer.insertTextBefore(firstStatement, `${ASSERT_IMPORT_STATEMENT}\n`);
            },
          });
        }
      },
    };
  },
});

export default rule;
