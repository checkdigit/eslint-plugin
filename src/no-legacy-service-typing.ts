// no-legacy-service-typing.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
} from '@typescript-eslint/utils';
import getDocumentationUrl from './get-documentation-url.ts';

export const ruleId = 'no-legacy-service-typing';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const DISALLOWED_SERVICE_TYPINGS: string[] | undefined = [
  'FullResponse',
  'Endpoint',
];

const rule: ESLintUtils.RuleModule<
  'noLegacyServiceTyping',
  [typeof DISALLOWED_SERVICE_TYPINGS]
> = createRule({
  name: ruleId,
  meta: {
    type: 'problem',
    docs: {
      description: 'Legacy service typings should not be used.',
    },
    messages: {
      noLegacyServiceTyping:
        'Please remove the usage of legacy service typings.',
    },

    schema: [
      {
        type: 'array',
        items: { type: 'string' },
        description: 'Legacy service typings should not be used.',
      },
    ],
    defaultOptions: [DISALLOWED_SERVICE_TYPINGS],
  },
  create(context) {
    return {
      TSTypeReference: (typeReference: TSESTree.TSTypeReference) => {
        if (
          typeReference.typeName.type === AST_NODE_TYPES.Identifier &&
          context.options[0].includes(typeReference.typeName.name)
        ) {
          context.report({
            messageId: 'noLegacyServiceTyping',
            node: typeReference,
          });
        }
      },
    };
  },
});

export default rule;
