# Make sure that @checkdigit/aws-config is applied when using AWS Sdk V3 clients. Also using the deprecated @checkdigit/aws module is disallowed if the service is migrating to AWS Sdk V3.

## Fail

```js
import aws from '@checkdigit/aws';

const dynamoClient = new DynamoDBClient({});
```

## Pass

```js
const dynamoClient = awsConfig(DynamoDBClient, { qualifier, environment });
```
