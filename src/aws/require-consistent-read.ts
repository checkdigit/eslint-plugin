// aws/require-consistent-read.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import getDocumentationUrl from '../get-documentation-url.ts';

export const ruleId = 'require-consistent-read';
export const MESSAGE_ID_CONSISTENT_READ_TRUE = 'MESSAGE_ID_CONSISTENT_READ_TRUE';
export const MESSAGE_ID_CONSISTENT_READ_FALSE = 'MESSAGE_ID_CONSISTENT_READ_FALSE';

interface ReadCommandInfo {
  type: 'GetItemCommand' | 'QueryCommand' | 'BatchGetItemCommand';
  consistentRead?: boolean;
  usedIndex?: boolean;
}

function getPropertyName(property: TSESTree.Property): string | undefined {
  if (property.computed) {
    return undefined;
  }
  const propertyKey = property.key;
  // eslint-disable-next-line no-nested-ternary
  return propertyKey.type === AST_NODE_TYPES.Identifier
    ? propertyKey.name
    : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      propertyKey.type === AST_NODE_TYPES.Literal && typeof propertyKey.value === 'string'
      ? propertyKey.value
      : undefined;
}

function extractObjectProperties(objectExpression: TSESTree.ObjectExpression): Record<string, TSESTree.Property> {
  const objectProperties: Record<string, TSESTree.Property> = {};
  for (const property of objectExpression.properties) {
    if (property.type !== AST_NODE_TYPES.Property || property.computed) {
      continue;
    }
    const propertyName = getPropertyName(property);
    if (propertyName !== undefined) {
      objectProperties[propertyName] = property;
    }
  }
  return objectProperties;
}

function existsRequestItemsProperty(extractedObjectProperties: Record<string, TSESTree.Property>): boolean {
  const requestItemProperty = extractedObjectProperties['RequestItems'];
  if (requestItemProperty?.type !== AST_NODE_TYPES.Property) {
    return false;
  }
  const requestItemValue = requestItemProperty.value;
  if (requestItemValue.type !== AST_NODE_TYPES.ObjectExpression) {
    return false;
  }
  // any table entry with an object having a Keys array
  return requestItemValue.properties.some(
    (property) =>
      property.type === AST_NODE_TYPES.Property &&
      property.value.type === AST_NODE_TYPES.ObjectExpression &&
      extractObjectProperties(property.value)['Keys']?.value.type === AST_NODE_TYPES.ArrayExpression,
  );
}

function existsKeyProperty(extractedObjectProperties: Record<string, TSESTree.Property>): boolean {
  const keyProperty = extractedObjectProperties['Key'];
  // Relaxed: just ensure it's an object (works for both low-level and DocumentClient)
  return keyProperty?.type === AST_NODE_TYPES.Property && keyProperty.value.type === AST_NODE_TYPES.ObjectExpression;
}

export function getReadCommandInfo(objectExpression: TSESTree.ObjectExpression): ReadCommandInfo | undefined {
  const extractedProperties = extractObjectProperties(objectExpression);
  let readCommandInfo: ReadCommandInfo | undefined;

  if (existsRequestItemsProperty(extractedProperties)) {
    readCommandInfo = { type: 'BatchGetItemCommand' };
  } else {
    const hasTableName = 'TableName' in extractedProperties;
    const hasKey = existsKeyProperty(extractedProperties);
    if (hasTableName && hasKey) {
      readCommandInfo = { type: 'GetItemCommand' };
    } else {
      const hasKeyCondExpr = extractedProperties['KeyConditionExpression']?.value.type === AST_NODE_TYPES.Literal;
      const hasLegacyKeyConditions =
        extractedProperties['KeyConditions']?.value.type === AST_NODE_TYPES.ObjectExpression;
      if (hasTableName && (hasKeyCondExpr || hasLegacyKeyConditions)) {
        readCommandInfo = { type: 'QueryCommand' };
      }
    }
  }

  if (readCommandInfo === undefined) {
    return undefined;
  }

  const consistentReadProperty = extractedProperties['ConsistentRead'];
  if (
    consistentReadProperty?.type === AST_NODE_TYPES.Property &&
    consistentReadProperty.value.type === AST_NODE_TYPES.Literal &&
    typeof consistentReadProperty.value.value === 'boolean'
  ) {
    readCommandInfo.consistentRead = consistentReadProperty.value.value;
  }

  const indexNameProperty = extractedProperties['IndexName'];
  if (
    indexNameProperty?.type === AST_NODE_TYPES.Property &&
    indexNameProperty.value.type === AST_NODE_TYPES.Literal &&
    typeof indexNameProperty.value.value === 'string'
  ) {
    readCommandInfo.usedIndex = true;
  }

  return readCommandInfo;
}

const createRule = ESLintUtils.RuleCreator((name) => getDocumentationUrl(name));

const rule: ESLintUtils.RuleModule<typeof MESSAGE_ID_CONSISTENT_READ_TRUE | typeof MESSAGE_ID_CONSISTENT_READ_FALSE> =
  createRule({
    name: ruleId,
    meta: {
      type: 'problem',
      docs: {
        description:
          'For AWS dynamodb commands Query/Get/BatchGet, ConsistentRead option should be set as true unless global index is used. this will make the service more robust at the ignorable cost of RCU.',
      },
      messages: {
        [MESSAGE_ID_CONSISTENT_READ_TRUE]: 'ConsistentRead option should be set as true for {{readCommandType}}.',
        [MESSAGE_ID_CONSISTENT_READ_FALSE]:
          'ConsistentRead option should be set as false for {{readCommandType}} when using a global secondary index.',
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        ObjectExpression(node) {
          // Quick prefilter: only look at objects that mention table/read-ish keys
          const text = sourceCode.getText(node);
          if (!/TableName|RequestItems|KeyConditionExpression|KeyConditions/u.test(text)) {
            return;
          }

          const readCommandInfo = getReadCommandInfo(node);
          if (readCommandInfo !== undefined) {
            if (readCommandInfo.usedIndex !== true && readCommandInfo.consistentRead !== true) {
              context.report({
                node,
                messageId: MESSAGE_ID_CONSISTENT_READ_TRUE,
                data: { readCommandType: readCommandInfo.type },
              });
            } else if (readCommandInfo.usedIndex === true && readCommandInfo.consistentRead !== false) {
              context.report({
                node,
                messageId: MESSAGE_ID_CONSISTENT_READ_FALSE,
                data: { readCommandType: readCommandInfo.type },
              });
            }
          }
        },
      };
    },
  });

export default rule;
