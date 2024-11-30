import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export function createDynamoDBContext() {
  const client = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint: process.env.TEST_DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'dummykey123',
      secretAccessKey: 'dummysecretkey123',
    },
  });
  const document = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  return {
    dynamoDBClient: client,
    dynamoDBDocumentClient: document,
  };
}

export const { dynamoDBClient, dynamoDBDocumentClient } = createDynamoDBContext();
