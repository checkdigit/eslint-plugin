# Enforce Bare-Bones AWS SDK v3 Client Usage

Ensure that only bare-bones AWS SDK v3 clients, libs, and commands are imported and used. Importing and using aggregated clients (e.g., `S3`, `DynamoDB`) is disallowed to promote modularization and enable better tree-shaking for reduced bundle size.

## Fail

```js
import { S3 } from '@aws-sdk/client-s3';

const s3 = new S3({});
await s3.getObject({});
```

```js
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { Storage } from '@aws-sdk/lib-storage';
```

## Pass

```js
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});
await s3.send(new GetObjectCommand({}));

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({});
await ddb.send(new PutItemCommand({}));
```
