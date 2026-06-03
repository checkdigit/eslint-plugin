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
      name: 'Get with consistent read',
      code: `dynamoDb.send(new GetCommand({
        TableName: 'MyTable',
        Key: {
          id: '123',
        },
        ConsistentRead: true,
      }));`,
    },
    {
      name: 'Query with consistent read',
      code: `const TABLE_NAME = 'MyTable';
        dynamoDb.send(new QueryCommand({
          TableName: TABLE_NAME,
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
      name: 'BatchGet with consistent read',
      code: `dynamoDb.send(new BatchGetCommand({
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
    {
      name: 'No error should be reported for Update command',
      code: `dynamoDb.send(new UpdateItemCommand({
        TableName: ACCOUNTS_TABLE,
        Key: {
          accountId: account.accountId,
        },
        UpdateExpression: 'SET version = :version',
        ConditionExpression: 'version = :oldVersion',
        ExpressionAttributeValues: {
          ':version': entryToCreate.entryId,
          ':oldVersion': account.version,
        },
      }));`,
    },
  ],
  invalid: [
    {
      name: 'Get without consistent read',
      code: `dynamoDb.send(new GetCommand({
            TableName: 'MyTable',
            Key: {
              id: '123',
            },
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'Get' } }],
    },
    {
      name: 'ConsistentRead not being literal true should be reported as well',
      code: `const consistentRead = Math.random() > 0.5;
          dynamoDb.send(new GetCommand({
            TableName: 'MyTable',
            Key: {
              id: '123',
            },
            ConsistentRead: consistentRead,
        }));`,
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'Get' } }],
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
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'Query' } }],
    },
    {
      name: 'BatchGet without consistent read',
      code: `dynamoDb.send(new BatchGetCommand({
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
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_TRUE, data: { readCommandType: 'BatchGet' } }],
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
      errors: [{ messageId: MESSAGE_ID_CONSISTENT_READ_FALSE, data: { readCommandType: 'Query' } }],
    },
  ],
});
