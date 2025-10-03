# For AWS dynamodb commands Query/GetItem/BatchGetItem, ConsistentRead option should be set as true unless global index is used. this will make the service more robust at the ignorable cost of RCU.

## Fail

```js
await dynamoClient.send(
  new GetCommand({
    TableName: ACCOUNT_TABLE,
    Key: { accountId },
  }),
);

await dynamoClient.send(
  new QueryCommand({
    TableName: CARDS_TABLE,
    ConsistentRead: false,
    KeyConditionExpression: 'cardId = :cardIdId',
    ExpressionAttributeValues: {
      ':cardIdId': cardId,
    },
  }),
);
```

## Pass

```js
await dynamoClient.send(
  new GetCommand({
    TableName: ACCOUNT_TABLE,
    Key: { accountId },
    ConsistentRead: true,
  }),
);

await dynamoClient.send(
  new QueryCommand({
    TableName: CARDS_TABLE,
    ConsistentRead: true,
    KeyConditionExpression: 'cardId = :cardIdId',
    ExpressionAttributeValues: {
      ':cardIdId': cardId,
    },
  }),
);

await dynamoClient.send(
  new QueryCommand({
    TableName: CARDS_TABLE,
    IndexName: 'keyId-index',
    ConsistentRead: false, // because global index is used
    KeyConditionExpression: 'cardId = :cardId AND keyId = :keyId',
    ExpressionAttributeValues: {
      ':cardId': cardId,
      ':keyId': keyId,
    },
  }),
);
```
