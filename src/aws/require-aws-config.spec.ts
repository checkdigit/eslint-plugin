// aws/require-aws-config.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { describe, it } from 'node:test';

import rule, {
  MESSAGE_ID_NO_CHECKDIGIT_AWS,
  MESSAGE_ID_REQUIRE_AWS_CONFIG,
  ruleId,
} from './require-aws-config.ts';
import { createTypescriptRuleTester } from '../rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createTypescriptRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Valid kms import and client usage when using sdk v3',
          settings: { isAwsSdkV3Used: true },
          code: `import { EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
        const command = new EncryptCommand({});`,
        },
        {
          name: 'Valid dynamo import and client usage with awsConfig when using sdk v3',
          settings: { isAwsSdkV3Used: true },
          code: `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
        const dynamoClient = awsConfig(DynamoDBClient, {qualifier, environment});`,
        },
        {
          name: 'Valid payment cryptography import and client usage with awsConfig when using sdk v3',
          settings: { isAwsSdkV3Used: true },
          // we probably should add a separate rule to disallow "aggregated client" pattern and force using Bare-bones clients/commands
          code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptography();`,
        },
        {
          name: 'Valid s3 import and client usage when not using sdk v3',
          settings: { isAwsSdkV3Used: false },
          code: `import { S3Client } from '@aws-sdk/client-s3';
        const s3Client = new S3Client({});`,
        },
      ],
      invalid: [],
    });
  });

  it('errors on invalid code and provides the correct error message', () => {
    ruleTester.run(ruleId, rule, {
      valid: [],
      invalid: [
        {
          name: 'Invalid s3 import and client usage when using sdk v3 without awsConfig',
          settings: { isAwsSdkV3Used: true },
          code: `import { S3Client } from '@aws-sdk/client-s3';
        const s3Client = new S3Client({});`,
          errors: [
            {
              messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
              data: { awsClientName: 'S3Client' },
            },
          ],
        },
        {
          name: 'Invalid DynamoDB import and client usage when using sdk v3 without awsConfig',
          settings: { isAwsSdkV3Used: true },
          code: `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
        const dynamoClient = new DynamoDBClient({});`,
          errors: [
            {
              messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
              data: { awsClientName: 'DynamoDBClient' },
            },
          ],
        },
        {
          name: 'Invalid KMS import and client usage when using sdk v3 without awsConfig',
          settings: { isAwsSdkV3Used: true },
          code: `import { KMSClient } from '@aws-sdk/client-kms';
        const kmsClient = new KMSClient({});`,
          errors: [
            {
              messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
              data: { awsClientName: 'KMSClient' },
            },
          ],
        },
        {
          name: 'Invalid Athena import and client usage when using sdk v3 without aws config',
          settings: { isAwsSdkV3Used: true },
          code: `import { AthenaClient } from '@aws-sdk/client-athena';
        const athenaClient = new AthenaClient({});`,
          errors: [
            {
              messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG,
              data: { awsClientName: 'AthenaClient' },
            },
          ],
        },
        {
          name: 'Invalid aws import when using sdk v3',
          settings: { isAwsSdkV3Used: true },
          code: `import aws from '@checkdigit/aws';`,
          errors: [{ messageId: MESSAGE_ID_NO_CHECKDIGIT_AWS }],
        },
      ],
    });
  });
});
