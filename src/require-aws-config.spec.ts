// require-aws-config.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { MESSAGE_ID_REQUIRE_AWS_CONFIG, ruleId } from './require-aws-config.ts';
import createTester from './ts-tester.test.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      code: `import { EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
        const command = new EncryptCommand({});`,
    },
    {
      code: `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
        const dynamoClient = awsConfig(DynamoDBClient, {qualifier, environment});`,
    },
    {
      // we probably should add a separate rule to disallow "aggregated client" pattern and force using Bare-bones clients/commands
      code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptography();`,
    },
  ],
  invalid: [
    {
      code: `import { S3Client } from '@aws-sdk/client-s3';
        const s3Client = new S3Client({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'S3Client' } }],
    },
    {
      code: `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
        const dynamoClient = new DynamoDBClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'DynamoDBClient' } }],
    },
    {
      code: `import { KMSClient } from '@aws-sdk/client-kms';
        const kmsClient = new KMSClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'KMSClient' } }],
    },
    {
      code: `import { AthenaClient } from '@aws-sdk/client-athena';
        const athenaClient = new AthenaClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'AthenaClient' } }],
    },
  ],
});
