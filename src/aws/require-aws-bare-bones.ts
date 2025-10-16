// require-aws-bare-bones.ts

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url.ts';

export const ruleId = 'require-aws-bare-bones';
export const MESSAGE_ID_AGGREGATED_CLIENT = 'noAggregatedClient';

const BARE_BONES_SUFFIXES = new Set(['Client', 'Command', 'Exception', 'Input', 'Output']);
const AWS_LIB_AGGREGATED_SUFFIXES = new Set(['Document', 'Paginator', 'Utils', 'Service', 'Collection', 'Manager']);
const AWS_SDK_CLIENT = '@aws-sdk/client-';
const AWS_SDK_LIB = '@aws-sdk/lib-';

const createRule = ESLintUtils.RuleCreator(getDocumentationUrl);

const isAwsSdkClientModule = ({ source }: TSESTree.ImportDeclaration): boolean =>
  typeof source.value === 'string' && (source.value.startsWith(AWS_SDK_CLIENT) || source.value.startsWith(AWS_SDK_LIB));

const kebabToPascal = (str: string): string =>
  str
    .split('-')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join('');

const endsWithAnySuffix = (name: string, suffixes: Set<string>): boolean =>
  Array.from(suffixes).some((suffix) => name.endsWith(suffix));

const isAggregatedClient = (name: string, importSource: string): boolean => {
  if (importSource.startsWith(AWS_SDK_CLIENT)) {
    return !endsWithAnySuffix(name, BARE_BONES_SUFFIXES);
  }
  if (importSource.startsWith(AWS_SDK_LIB)) {
    const pkg = importSource.replace(AWS_SDK_LIB, '');
    const pkgPascal = kebabToPascal(pkg);
    return (
      (name.startsWith(pkgPascal) && !endsWithAnySuffix(name, BARE_BONES_SUFFIXES)) ||
      endsWithAnySuffix(name, AWS_LIB_AGGREGATED_SUFFIXES)
    );
  }
  return false;
};

const rule: ESLintUtils.RuleModule<typeof MESSAGE_ID_AGGREGATED_CLIENT> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing aggregated AWS SDK v3 clients. Use bare-bones pattern (Client/Lib plus Command) for better tree-shaking.',
    },
    messages: {
      [MESSAGE_ID_AGGREGATED_CLIENT]:
        'Do not import aggregated AWS SDK v3 client "{{clientName}}". Use bare-bones pattern ({{clientName}}Client/Lib plus Command) instead.',
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

          if (
            specifier.type === AST_NODE_TYPES.ImportSpecifier &&
            !isTypeImport &&
            isAggregatedClient(specifier.local.name, node.source.value)
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
