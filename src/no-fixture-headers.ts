// no-fixture.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type {
  Identifier,
  MemberExpression,
  VariableDeclarator,
} from 'estree';
import { getEnclosingScopeNode, getParent } from './ast/tree';
import { type Rule } from 'eslint';
import { strict as assert } from 'node:assert';
import getDocumentationUrl from './get-documentation-url';

export const ruleId = 'no-fixture-headers';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native fetch API over customized fixture API.',
      url: getDocumentationUrl(ruleId),
    },
    messages: {
      preferNativeFetch: 'Prefer native fetch API over customized fixture API.',
      unknownError:
        'Unknown error occurred in file "{{fileName}}": {{ error }}. Please manually convert the fixture API call to fetch API call.',
    },
    fixable: 'code',
    schema: [],
  },
  // eslint-disable-next-line max-lines-per-function
  create(context) {
    const sourceCode = context.sourceCode;
    const scopeManager = sourceCode.scopeManager;

    return {
      // eslint-disable-next-line max-lines-per-function
      'VariableDeclarator[init.argument.callee.name="fetch"]': (fetchCall: VariableDeclarator) => {
        try {
          const enclosingScopeNode = getEnclosingScopeNode(fetchCall);
          assert.ok(fetchCall.id.type === 'Identifier');
          const fetchVariableName = fetchCall.id.name; /*?*/
          assert.ok(enclosingScopeNode !== undefined, 'enclosing scope node should exist');
          const scope = scopeManager.acquire(enclosingScopeNode);
          const responseVariable = scope?.variables.find((variable) => {
            const identifier = variable.identifiers[0];
            return identifier?.type === 'Identifier' && identifier.name === fetchVariableName;
          });
          if (responseVariable === undefined) {
            return;
          }

          const headersReferences = responseVariable.references
            .map((reference) => getParent(reference.identifier))
            .filter(
              (parent): parent is MemberExpression =>
                parent?.type === 'MemberExpression' &&
                parent.property.type === 'Identifier' &&
                parent.property.name === 'headers',
            );
          const directHeadersReferences = headersReferences
            .map(getParent)
            .filter(
              (parent): parent is MemberExpression =>
                parent?.type === 'MemberExpression' &&
                !(parent.property.type === 'Identifier' && parent.property.name === 'get'),
            );
          directHeadersReferences.map((reference) => sourceCode.getText(reference)); /*?*/

          const reDeclaredHeadersVariableNames = headersReferences
            .map((reference) => getParent(reference))
            .filter((parent): parent is VariableDeclarator => parent?.type === 'VariableDeclarator')
            .map((declarator) => (declarator.id as Identifier).name);

          const indirectHeadersReferences = reDeclaredHeadersVariableNames
            .map((variableName) => {
              const headersVariable = scope?.variables.find((variable) => {
                const identifier = variable.identifiers[0];
                return identifier?.type === 'Identifier' && identifier.name === variableName;
              });
              return (
                headersVariable?.references
                  .map((reference) => getParent(reference.identifier))
                  .filter(
                    (parent): parent is MemberExpression =>
                      parent?.type === 'MemberExpression' &&
                      !(parent.property.type === 'Identifier' && parent.property.name === 'get'),
                  ) ?? []
              );
            })
            .flat();
          indirectHeadersReferences.map((reference) => sourceCode.getText(reference)); /*?*/

          const invalidHeadersReferences = [...directHeadersReferences, ...indirectHeadersReferences].map<
            [MemberExpression, string]
          >((reference) => {
            sourceCode.getText(reference); /*?*/
            const headerNameNode = reference.property; /*?*/
            const headerName =
              // eslint-disable-next-line no-nested-ternary, @typescript-eslint/restrict-template-expressions
              reference.computed ? sourceCode.getText(headerNameNode) : `'${sourceCode.getText(headerNameNode)}'`; /*?*/
            const replacementText = `${sourceCode.getText(reference.object)}.get(${headerName})`;
            return [reference, replacementText];
          });

          context.report({
            node: fetchCall,
            messageId: 'preferNativeFetch',
            *fix(fixer) {
              // handle response headers references
              for (const [node, replacementText] of invalidHeadersReferences) {
                yield fixer.replaceText(node, replacementText);
              }
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to apply ${ruleId} rule for file "${context.filename}":`, error);
          context.report({
            node: fetchCall,
            messageId: 'unknownError',
            data: {
              fileName: context.filename,
              error: error instanceof Error ? error.toString() : JSON.stringify(error),
            },
          });
        }
      },
    };
  },
};

export default rule;
