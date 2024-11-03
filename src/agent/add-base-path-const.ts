// agent/add-url-domain.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import getDocumentationUrl from '../get-documentation-url';
import { getProjectRootFolder, getSwaggerPathByIndexFile, isApiIndexFile, loadPackageJson, loadSwagger } from './file';

export const ruleId = 'add-base-path-const';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'addBasePathConst'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Add BASE_PATH const variable.',
    },
    messages: {
      addBasePathConst: 'Add BASE_PATH const variable.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program: (program: TSESTree.Program) => {
        if (!isApiIndexFile(context.filename)) {
          return;
        }

        const scope = sourceCode.getScope(program).childScopes[0];
        assert(scope);

        const foundBasePathConst = scope.variables.find((variable) => variable.name === 'BASE_PATH');
        if (foundBasePathConst) {
          return;
        }

        const swaggerPath = getSwaggerPathByIndexFile(context.filename);
        const swaggerFileContents = loadSwagger(swaggerPath);
        const baseUrlLine = swaggerFileContents.split('\n').find((line) => /^\s*-\s*url:\s*\/.*$/u.test(line));
        const baseUrl = baseUrlLine?.split(':')[1]?.trim();
        assert(baseUrl !== undefined);

        const packageRoot = getProjectRootFolder(context.filename);
        const packageJson = JSON.parse(loadPackageJson(packageRoot)) as { name: string };
        const serviceName = packageJson.name.split('/')[1];
        assert(serviceName !== undefined);

        const domain = `https://${serviceName}.checkdigit${baseUrl}`;

        const lastImportStatement = program.body.findLast((node) => node.type === AST_NODE_TYPES.ImportDeclaration);
        assert(lastImportStatement);

        context.report({
          messageId: 'addBasePathConst',
          node: program,
          fix(fixer) {
            return fixer.insertTextAfter(lastImportStatement, `\nexport const BASE_PATH = '${domain}';\n`);
          },
        });
      },
    };
  },
});

export default rule;
