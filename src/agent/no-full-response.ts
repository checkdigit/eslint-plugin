// agent/no-full-response.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url';

export const ruleId = 'no-full-response';

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<'noFullResponse'> = createRule({
  name: ruleId,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'FullResponse type should not be used.',
    },
    messages: {
      noFullResponse: 'Please remove the usage of FullResponse type.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      'TSTypeReference[typeName.name="FullResponse"]': (typeReference: TSESTree.TSTypeReference) => {
        context.report({
          messageId: 'noFullResponse',
          node: typeReference,
        });
      },
    };
  },
});

export default rule;
