// aws/require-consistent-read.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test.ts';
import rule, {
  MESSAGE_ID_CONSISTENT_READ_FALSE,
  MESSAGE_ID_CONSISTENT_READ_TRUE,
  ruleId,
} from './require-consistent-read.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'GetItem with consistent read',
      code: `dynamoDb.send(new GetItemCommand({
        TableName: 'MyTable',
        Key: {
          id: '123',
        },
        ConsistentRead: true,
      }));`,
    },
    {
      name: 'Query with consistent read',
      code: `dynamoDb.send(new QueryCommand({
        TableName: 'MyTable',
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'id',
            },
            ExpressionAttributeValues: {
              ':id': '123',
            },
            ConsistentRead: true,
        }));`,
    },
    {
      name: 'BatchGetItem with consistent read',
      code: `dynamoDb.send(new BatchGetItemCommand({
            RequestItems: {
              'MyTable': {
                Keys: [
                  {
                    id: '123',
                  },
                ],
              },
            },
            ConsistentRead: true,
        }));`,
    },
    {
      name: 'Query with global index and without consistent read',
      code: `dynamoDb.send(new QueryCommand({
            TableName: 'MyTable',
            IndexName: 'MyIndex',
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
              '#id': 'id',
            },
            ExpressionAttributeValues: {
              ':id': '123',
            },
            ConsistentRead: false,
        }));`,
    },
  ],
  invalid: [
    {
      name: 'GetItem without consistent read',
      code: `dynamoDb.send(new GetItemCommand({
            TableName: 'MyTable',
            Key: {
              id: '123',
            },
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'GetItemCommand' } }],
    },
    {
      name: 'Query without consistent read',
      code: `dynamoDb.send(new QueryCommand({
            TableName: 'MyTable',
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
              '#id': 'id',
            },
            ExpressionAttributeValues: {
              ':id': '123',
            },
            ConsistentRead: false,
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'QueryCommand' } }],
    },
    {
      name: 'BatchGetItem without consistent read',
      code: `dynamoDb.send(new BatchGetItemCommand({
            RequestItems: {
              'MyTable': {
                Keys: [
                  {
                    id: '123',
                  },
                ],
              },
            },
            ConsistentRead: false,
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'BatchGetItemCommand' } }],
    },
    {
      name: 'Query with global index but incorrectly with consistent read as well',
      code: `dynamoDb.send(new QueryCommand({
            TableName: 'MyTable',
            IndexName: 'MyIndex',
            KeyConditionExpression: '#id = :id',
            ExpressionAttributeNames: {
              '#id': 'id',
            },
            ExpressionAttributeValues: {
              ':id': '123',
            },
            ConsistentRead: true,
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_FALSE, data: { readCommandType: 'QueryCommand' } }],
    },
  ],
});
