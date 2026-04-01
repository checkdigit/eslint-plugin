// require-aws-bare-bones.spec.ts

import { describe, it } from 'node:test';

import rule, {
  MESSAGE_ID_AGGREGATED_CLIENT,
  ruleId,
} from './require-aws-bare-bones.ts';
import { createTypescriptRuleTester } from '../rule-tester.test.ts';

describe(ruleId, () => {
  const ruleTester = createTypescriptRuleTester();

  it('validates good code', () => {
    ruleTester.run(ruleId, rule, {
      valid: [
        {
          name: 'Valid s3 import, client creation and usage',
          code: `import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
        const s3 = new S3Client({});
        await s3.send(new GetObjectCommand({}));`,
        },
        {
          name: 'Valid DynamoDB import, client creation and usage',
          code: `import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
        const ddb = new DynamoDBClient({});
        await ddb.send(new PutItemCommand({}));`,
        },
        {
          name: 'Valid SNS import, client creation and usage',
          code: `import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
        const sns = new SNSClient({});
        await sns.send(new PublishCommand({}));`,
        },
        {
          name: 'Valid SQS import, client creation and usage',
          code: `import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
        const sqs = new SQSClient({});
        await sqs.send(new SendMessageCommand({}));`,
        },
        {
          name: 'Valid Kinesis import, client creation and usage',
          code: `import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
        const kinesis = new KinesisClient({});
        await kinesis.send(new PutRecordCommand({}));`,
        },
        {
          name: 'Valid Lambda import, client creation and usage',
          code: `import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
        const lambda = new LambdaClient({});
        await lambda.send(new InvokeCommand({}));`,
        },
        {
          name: 'Valid SecretsManager import, client creation and usage',
          code: `import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
        const secrets = new SecretsManagerClient({});
        await secrets.send(new GetSecretValueCommand({}));`,
        },
        {
          name: 'Valid EventBridge import, client creation and usage',
          code: `import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
        const eb = new EventBridgeClient({});
        await eb.send(new PutEventsCommand({}));`,
        },
        {
          name: 'Valid StepFunctions import, client creation and usage',
          code: `import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
        const sfn = new SFNClient({});
        await sfn.send(new StartExecutionCommand({}));`,
        },
        {
          name: 'Valid CloudWatch import, client creation and usage',
          code: `import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
        const cw = new CloudWatchClient({});
        await cw.send(new PutMetricDataCommand({}));`,
        },
        {
          name: 'Valid PaymentCryptography import, client creation and usage',
          code: `import { PaymentCryptographyClient, EncryptCommand } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptographyClient({});
        await paymentCryptography.send(new EncryptCommand({}));`,
        },
        {
          name: 'Valid mixed imports from @aws-sdk/client-s3',
          code: `import { S3Client, GetObjectCommand, type GetObjectCommandOutput } from '@aws-sdk/client-s3';`,
        },
        {
          name: 'Valid import from @aws-sdk/client-payment-cryptography',
          code: `import { VerificationFailedException, VerifyPinDataCommand } from '@aws-sdk/client-payment-cryptography-data';`,
        },
        {
          name: 'Valid type import from @aws-sdk/client-payment-cryptography',
          code: `import { type ImportKeyInput } from '@aws-sdk/client-payment-cryptography';`,
        },
        {
          name: 'Valid function imports from @aws-sdk/client-payment-cryptography',
          code: `import { PaymentCryptographyClient, EncryptCommand } from '@aws-sdk/client-payment-cryptography';`,
        },
        {
          name: 'Valid mixed imports from @aws-sdk/client-payment-cryptography',
          code: `import { VerificationFailedException  } from '@aws-sdk/client-payment-cryptography-data';
            import {
              CreateAliasCommand,
              type CreateAliasCommandOutput,
              type CreateAliasInput,
              ImportKeyCommand,
              type ImportKeyCommandOutput,
              type ImportKeyInput,
            } from '@aws-sdk/client-payment-cryptography'`,
        },
        {
          name: 'Valid import from @checkdigit/aws',
          code: `import aws from '@checkdigit/aws';`,
        },
        {
          name: 'Valid use of aws-sdk clients, functions, types and client creation',
          code: `import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
             import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
             import awsConfig from '@checkdigit/aws-config';
        const dynamo = awsConfig(DynamoDBDocumentClient, { qualifier, environment });
        const dynamoDocument = DynamoDBDocument.from(dynamo);
        await dynamoDocument.send(new PutCommand({ TableName: 'foo', Item: { id: 1 } }));`,
        },
        {
          name: 'Valid mixed imports from @aws-sdk/client-s3 and @aws-sdk/lib-storage with client creation and usage',
          code: `import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
            import { Upload } from '@aws-sdk/lib-storage';
            const s3 = new S3Client({});
            const upload = new Upload({ client: s3, params: { Bucket: 'b', Key: 'k', Body: 'data' } });`,
        },
        {
          name: 'Valid import structure on a generic @aws-sdk package',
          code: `import { someUtility } from '@aws-sdk/lib-utilities';`,
        },
        {
          name: 'Valid import structure on two different @aws-sdk packages',
          code: `import { S3Client } from '@aws-sdk/client-s3';
             import { Upload } from '@aws-sdk/lib-storage';`,
        },
        {
          name: 'Valid type import from @aws-sdk/lib-storage',
          code: `import { type UploadOptions } from '@aws-sdk/lib-storage';`,
        },
        {
          name: 'Valid type import from @aws-sdk/client-sts',
          code: `import type { Credentials } from '@aws-sdk/client-sts';`,
        },
        {
          name: 'Valid mixed imports from @aws-sdk/client-s3',
          code: `import { S3Client, type S3 } from '@aws-sdk/client-s3';`,
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
          name: 'Invalid S3 client usage',
          code: `import { S3 } from '@aws-sdk/client-s3';
        const s3 = new S3({});
        await s3.getObject({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'S3' },
            },
          ],
        },
        {
          name: 'Invalid DynamoDB client usage',
          code: `import { DynamoDB } from '@aws-sdk/client-dynamodb';
        const ddb = new DynamoDB({});
        await ddb.putItem({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'DynamoDB' },
            },
          ],
        },
        {
          name: 'Invalid SNS client usage',
          code: `import { SNS } from '@aws-sdk/client-sns';
        const sns = new SNS({});
        await sns.publish({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'SNS' },
            },
          ],
        },
        {
          name: 'Invalid SQS client usage',
          code: `import { SQS } from '@aws-sdk/client-sqs';
        const sqs = new SQS({});
        await sqs.sendMessage({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'SQS' },
            },
          ],
        },
        {
          name: 'Invalid Kinesis client usage',
          code: `import { Kinesis } from '@aws-sdk/client-kinesis';
        const kinesis = new Kinesis({});
        await kinesis.putRecord({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'Kinesis' },
            },
          ],
        },
        {
          name: 'Invalid Lambda client usage',
          code: `import { Lambda } from '@aws-sdk/client-lambda';
        const lambda = new Lambda({});
        await lambda.invoke({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'Lambda' },
            },
          ],
        },
        {
          name: 'Invalid SecretsManager client usage',
          code: `import { SecretsManager } from '@aws-sdk/client-secrets-manager';
        const secrets = new SecretsManager({});
        await secrets.getSecretValue({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'SecretsManager' },
            },
          ],
        },
        {
          name: 'Invalid EventBridge client usage',
          code: `import { EventBridge } from '@aws-sdk/client-eventbridge';
        const eb = new EventBridge({});
        await eb.putEvents({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'EventBridge' },
            },
          ],
        },
        {
          name: 'Invalid StepFunctions client usage',
          code: `import { StepFunctions } from '@aws-sdk/client-sfn';
        const sfn = new StepFunctions({});
        await sfn.startExecution({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'StepFunctions' },
            },
          ],
        },
        {
          name: 'Invalid CloudWatch client usage',
          code: `import { CloudWatch } from '@aws-sdk/client-cloudwatch';
        const cw = new CloudWatch({});
        await cw.putMetricData({});`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'CloudWatch' },
            },
          ],
        },
        {
          name: 'Invalid PaymentCryptography client usage',
          code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptography();`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'PaymentCryptography' },
            },
          ],
        },
        {
          name: 'Invalid s3 client',
          code: `import { S3 } from '@aws-sdk/client-s3';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'S3' },
            },
          ],
        },
        {
          name: 'Invalid PaymentCryptography client',
          code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'PaymentCryptography' },
            },
          ],
        },
        {
          name: 'Invalid payment cryptography client',
          code: `import { ImportKeyCommand, ImportKeyInput, ImportKeyCommandOutput, PaymentCryptography } from '@aws-sdk/client-payment-cryptography';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'PaymentCryptography' },
            },
          ],
        },
        {
          name: 'Invalid DynamoDB client',
          code: `import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
        const ddbDoc = new DynamoDBDocument({});
        await ddbDoc.put({ TableName: 'foo', Item: { id: 1 } });`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'DynamoDBDocument' },
            },
          ],
        },
        {
          name: 'Invalid clients',
          code: `import { S3 } from '@aws-sdk/client-s3';
            import { Upload } from '@aws-sdk/lib-storage';
            const s3 = new S3({});
            const upload = new Upload({ client: s3, params: { Bucket: 'b', Key: 'k', Body: 'data' } });`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'S3' },
            },
          ],
        },
        {
          name: 'Invalid Storage client',
          code: `import { Storage } from '@aws-sdk/lib-storage';
             const storage = new Storage();`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'Storage' },
            },
          ],
        },
        {
          name: 'Invalid Utilities import',
          code: `import { Utilities } from '@aws-sdk/lib-utilities';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'Utilities' },
            },
          ],
        },
        {
          name: 'Invalid DynamoDBPaginator import',
          code: `import { DynamoDBPaginator } from '@aws-sdk/lib-dynamodb';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'DynamoDBPaginator' },
            },
          ],
        },
        {
          name: 'Invalid SQSManager import',
          code: `import { SQSManager } from '@aws-sdk/lib-sqs';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'SQSManager' },
            },
          ],
        },
        {
          name: 'Invalid s3 utils import',
          code: `import { S3Utils } from '@aws-sdk/lib-s3';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'S3Utils' },
            },
          ],
        },
        {
          name: 'Invalid LambdaService import',
          code: `import { LambdaService } from '@aws-sdk/lib-lambda';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'LambdaService' },
            },
          ],
        },
        {
          name: 'Invalid EC2Collection import',
          code: `import { EC2Collection } from '@aws-sdk/lib-ec2';`,
          errors: [
            {
              messageId: MESSAGE_ID_AGGREGATED_CLIENT,
              data: { clientName: 'EC2Collection' },
            },
          ],
        },
      ],
    });
  });
});
