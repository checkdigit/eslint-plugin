# Make sure that @checkdigit/aws-config is applied when using AWS Sdk V3 clients

## Fail

```js
const dynamoClient = new DynamoDBClient({});
```

## Pass

```js
const dynamoClient = awsConfig(DynamoDBClient, { qualifier, environment });
```
