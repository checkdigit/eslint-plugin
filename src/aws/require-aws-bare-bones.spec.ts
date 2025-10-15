// require-aws-bare-bones.spec.ts

import createTester from '../ts-tester.test.ts';
import rule, { MESSAGE_ID_AGGREGATED_CLIENT, ruleId } from './require-aws-bare-bones.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      code: `import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
        const s3 = new S3Client({});
        await s3.send(new GetObjectCommand({}));`,
    },
    {
      code: `import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
        const ddb = new DynamoDBClient({});
        await ddb.send(new PutItemCommand({}));`,
    },
    {
      code: `import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
        const sns = new SNSClient({});
        await sns.send(new PublishCommand({}));`,
    },
    {
      code: `import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
        const sqs = new SQSClient({});
        await sqs.send(new SendMessageCommand({}));`,
    },
    {
      code: `import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
        const kinesis = new KinesisClient({});
        await kinesis.send(new PutRecordCommand({}));`,
    },
    {
      code: `import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
        const lambda = new LambdaClient({});
        await lambda.send(new InvokeCommand({}));`,
    },
    {
      code: `import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
        const secrets = new SecretsManagerClient({});
        await secrets.send(new GetSecretValueCommand({}));`,
    },
    {
      code: `import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
        const eb = new EventBridgeClient({});
        await eb.send(new PutEventsCommand({}));`,
    },
    {
      code: `import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
        const sfn = new SFNClient({});
        await sfn.send(new StartExecutionCommand({}));`,
    },
    {
      code: `import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
        const cw = new CloudWatchClient({});
        await cw.send(new PutMetricDataCommand({}));`,
    },
    {
      code: `import { PaymentCryptographyClient, EncryptCommand } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptographyClient({});
        await paymentCryptography.send(new EncryptCommand({}));`,
    },
    {
      code: `import { S3Client, GetObjectCommand, type GetObjectCommandOutput } from '@aws-sdk/client-s3';`,
    },
    {
      code: `import { VerificationFailedException, VerifyPinDataCommand } from '@aws-sdk/client-payment-cryptography-data';`,
    },
    {
      code: `import { type ImportKeyInput } from '@aws-sdk/client-payment-cryptography';`,
    },
    {
      code: `import { PaymentCryptographyClient, EncryptCommand } from '@aws-sdk/client-payment-cryptography';`,
    },
    {
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
      code: `import aws from '@checkdigit/aws';`,
    },
    {
      code: `import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
             import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
             import awsConfig from '@checkdigit/aws-config';
        const dynamo = awsConfig(DynamoDBClient, { qualifier, environment });
        const dynamoDocument = DynamoDBDocument.from(dynamo);
        await dynamoDocument.send(new PutCommand({ TableName: 'foo', Item: { id: 1 } }));`,
    },
    {
      code: `import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
            import { Upload } from '@aws-sdk/lib-storage';
            const s3 = new S3Client({});
            const upload = new Upload({ client: s3, params: { Bucket: 'b', Key: 'k', Body: 'data' } });`,
    },
    {
      code: `import { someUtility } from '@aws-sdk/lib-utilities';`,
    },
    {
      code: `import { S3Client } from '@aws-sdk/client-s3';
             import { Upload } from '@aws-sdk/lib-storage';`,
    },
    {
      code: `import { type UploadOptions } from '@aws-sdk/lib-storage';`,
    },
  ],
  invalid: [
    {
      code: `import { S3 } from '@aws-sdk/client-s3';
        const s3 = new S3({});
        await s3.getObject({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'S3' } }],
    },
    {
      code: `import { DynamoDB } from '@aws-sdk/client-dynamodb';
        const ddb = new DynamoDB({});
        await ddb.putItem({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'DynamoDB' } }],
    },
    {
      code: `import { SNS } from '@aws-sdk/client-sns';
        const sns = new SNS({});
        await sns.publish({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'SNS' } }],
    },
    {
      code: `import { SQS } from '@aws-sdk/client-sqs';
        const sqs = new SQS({});
        await sqs.sendMessage({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'SQS' } }],
    },
    {
      code: `import { Kinesis } from '@aws-sdk/client-kinesis';
        const kinesis = new Kinesis({});
        await kinesis.putRecord({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'Kinesis' } }],
    },
    {
      code: `import { Lambda } from '@aws-sdk/client-lambda';
        const lambda = new Lambda({});
        await lambda.invoke({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'Lambda' } }],
    },
    {
      code: `import { SecretsManager } from '@aws-sdk/client-secrets-manager';
        const secrets = new SecretsManager({});
        await secrets.getSecretValue({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'SecretsManager' } }],
    },
    {
      code: `import { EventBridge } from '@aws-sdk/client-eventbridge';
        const eb = new EventBridge({});
        await eb.putEvents({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'EventBridge' } }],
    },
    {
      code: `import { StepFunctions } from '@aws-sdk/client-sfn';
        const sfn = new StepFunctions({});
        await sfn.startExecution({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'StepFunctions' } }],
    },
    {
      code: `import { CloudWatch } from '@aws-sdk/client-cloudwatch';
        const cw = new CloudWatch({});
        await cw.putMetricData({});`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'CloudWatch' } }],
    },
    {
      code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';
        const paymentCryptography = new PaymentCryptography();`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'PaymentCryptography' } }],
    },
    {
      code: `import { S3 } from '@aws-sdk/client-s3';`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'S3' } }],
    },
    {
      code: `import { PaymentCryptography } from '@aws-sdk/client-payment-cryptography';`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'PaymentCryptography' } }],
    },
    {
      code: `import { ImportKeyCommand, ImportKeyInput, ImportKeyCommandOutput, PaymentCryptography } from '@aws-sdk/client-payment-cryptography';`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'PaymentCryptography' } }],
    },
    {
      code: `import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
        const ddbDoc = new DynamoDBDocument({});
        await ddbDoc.put({ TableName: 'foo', Item: { id: 1 } });`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'DynamoDBDocument' } }],
    },
    {
      code: `import { S3 } from '@aws-sdk/client-s3';
            import { Upload } from '@aws-sdk/lib-storage';
            const s3 = new S3({});
            const upload = new Upload({ client: s3, params: { Bucket: 'b', Key: 'k', Body: 'data' } });`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'S3' } }],
    },
    {
      code: `import { Storage } from '@aws-sdk/lib-storage';
             const storage = new Storage();`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'Storage' } }],
    },
    {
      code: `import { Utilities } from '@aws-sdk/lib-utilities';`,
      errors: [{ messageId: MESSAGE_ID_AGGREGATED_CLIENT, data: { clientName: 'Utilities' } }],
    },
  ],
});
