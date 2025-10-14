// require-aws-bare-bones.ts

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url.ts';

export const ruleId = 'require-aws-bare-bones';
export const MESSAGE_ID_AGGREGATED_CLIENT = 'noAggregatedClient';

const BARE_BONES_SUFFIXES = /(?:Client|Command|Exception|Input|Output)$/u;

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

function isAwsSdkClientModule(importDeclaration: TSESTree.ImportDeclaration): boolean {
  return (
    typeof importDeclaration.source.value === 'string' && importDeclaration.source.value.startsWith('@aws-sdk/client-')
  );
}

function isAggregatedClient(name: string): boolean {
  return !BARE_BONES_SUFFIXES.test(name);
}

const rule: ESLintUtils.RuleModule<typeof MESSAGE_ID_AGGREGATED_CLIENT> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing aggregated AWS SDK v3 clients. Use bare-bones pattern (Client + Command) for better tree-shaking.',
    },
    messages: {
      [MESSAGE_ID_AGGREGATED_CLIENT]:
        'Do not import aggregated AWS SDK v3 client "{{clientName}}". Use bare-bones pattern ({{clientName}}Client + Command) instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!isAwsSdkClientModule(node)) {
          return;
        }

        for (const specifier of node.specifiers) {
          const isTypeImport = specifier.type === AST_NODE_TYPES.ImportSpecifier && specifier.importKind === 'type';
          const isException = specifier.local.name.endsWith('Exception');

          if (
            specifier.type === AST_NODE_TYPES.ImportSpecifier &&
            !isTypeImport &&
            !isException &&
            isAggregatedClient(specifier.local.name)
          ) {
            context.report({
              node: specifier,
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: specifier.local.name },
            });
          }
        }
      },
    };
  },
});

export default rule;
