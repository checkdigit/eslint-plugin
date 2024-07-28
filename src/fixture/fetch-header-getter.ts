// fixture/no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Identifier, MemberExpression, VariableDeclarator } from 'estree';
import type { Rule } from 'eslint';
import { analyzeResponseReferences } from './response-reference';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from '../get-documentation-url';
import { getParent } from '../ast/tree';

export const ruleId = 'fetch-header-getter';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Make sure getter is used to access response headers.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      shouldUseHeaderGetter: 'Getter should be used to access response headers.',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;

    return {
      'VariableDeclarator[init.argument.callee.name="fetch"]': (fetchCall: VariableDeclarator) => {
        const variableDeclaration = getParent(fetchCall);
        assert.ok(variableDeclaration?.type === 'VariableDeclaration');
        const { variable: responseVariable, headersReferences: responseHeadersReferences } = analyzeResponseReferences(
          variableDeclaration,
          scopeManager,
        );
        assert.ok(responseVariable);

        const directHeaderReferences = responseHeadersReferences
          .map(getParent)
          .filter((parent): parent is MemberExpression => parent?.type === 'MemberExpression');

        const indirectHeaderReferences = responseHeadersReferences
          .map((reference) => getParent(reference))
          .filter((parent): parent is VariableDeclarator => parent?.type === 'VariableDeclarator')
          .map((declarator) => (declarator.id as Identifier).name)
          .map((redefinedHeadersVariableName) => {
            const headersVariable = responseVariable.scope.variables.find((variable) => {
              const identifier = variable.identifiers[0];
              return identifier?.type === 'Identifier' && identifier.name === redefinedHeadersVariableName;
            });
            return (
              headersVariable?.references
                .map((reference) => getParent(reference.identifier))
                .filter((parent): parent is MemberExpression => parent?.type === 'MemberExpression') ?? []
            );
          })
          .flat();

        const invalidHeaderReferences = [...directHeaderReferences, ...indirectHeaderReferences].filter(
          (reference) => !(reference.property.type === 'Identifier' && reference.property.name === 'get'),
        );

        invalidHeaderReferences.forEach((reference) => {
          const headerNameNode = reference.property;
          const headerName = reference.computed
            ? sourceCode.getText(headerNameNode)
            : `'${sourceCode.getText(headerNameNode)}'`;
          const replacementText = `${sourceCode.getText(reference.object)}.get(${headerName})`;

          context.report({
            node: reference,
            messageId: 'shouldUseHeaderGetter',
            fix(fixer) {
              return fixer.replaceText(reference, replacementText);
            },
          });
        });
      },
    };
  },
};

export default rule;
