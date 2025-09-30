// file-path-comment.spec.ts

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
      settings: { isAwsSdkV3Used: false },
      code: `const dynamoClient = new DynamoDBClient({});`,
    },
    {
      settings: { isAwsSdkV3Used: true },
      code: `const dynamoClient = awsConfig(DynamoDBClient, {qualifier, environment});`,
    },
    {
      settings: { isAwsSdkV3Used: false },
      code: `const paymentCryptographyClient = new PaymentCryptography();`,
    },
    {
      settings: { isAwsSdkV3Used: true },
      code: `const paymentCryptographyClient = new PaymentCryptography();`,
    },
  ],
  invalid: [
    {
      settings: { isAwsSdkV3Used: true },
      code: `const s3Client = new S3Client({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'S3Client' } }],
    },
    {
      settings: { isAwsSdkV3Used: true },
      code: `const kmsClient = new KMSClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'KMSClient' } }],
    },
    {
      settings: { isAwsSdkV3Used: true },
      code: `const dynamoClient = new DynamoDBClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'DynamoDBClient' } }],
    },
    {
      settings: { isAwsSdkV3Used: true },
      code: `const athenaClient = new AthenaClient({});`,
      errors: [{ messageId: MESSAGE_ID_REQUIRE_AWS_CONFIG, data: { awsClientName: 'AthenaClient' } }],
    },
  ],
});
