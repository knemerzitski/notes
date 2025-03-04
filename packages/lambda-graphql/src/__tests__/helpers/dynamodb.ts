import {
  DynamoDBClient,
  ResourceNotFoundException,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { retryOnError } from '../../../../utils/src/retry-on-error';

export function createDynamoDBContext() {
  const client = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint: process.env.DYNAMODB_ENDPOINT,
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

interface ErrorAction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: new (...args: any[]) => Error;
  messages: string[];
  action: 'retry' | 'ok';
}

/**
 * Ensures that DynamoDB is ready to accept commands and wont
 * throw errors `socket hang up` or `read ECONNRESET`
 */
export async function assertDynamoDBIsReachable(client: DynamoDBDocumentClient) {
  const errorActions: ErrorAction[] = [
    {
      instance: Error,
      messages: ['socket hang up', 'read ECONNRESET'],
      action: 'retry',
    },
    {
      instance: ResourceNotFoundException,
      messages: ['Cannot do operations on a non-existent table'],
      action: 'ok',
    },
  ];

  let isOK = false;
  await retryOnError(
    () => {
      if (isOK) {
        return;
      }

      return client.send(
        new ScanCommand({
          TableName: 'random',
          Limit: 0,
          Select: 'COUNT',
        })
      );
    },
    {
      maxAttempts: 10,
      retryDelay: 1000,
      retryErrorCond: (error) => {
        for (const errorHandle of errorActions) {
          if (
            error instanceof errorHandle.instance &&
            errorHandle.messages.includes(error.message)
          ) {
            if (errorHandle.action === 'retry') {
              return true;
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (errorHandle.action === 'ok') {
              isOK = true;
              return true;
            }
          }
        }
        return false;
      },
    }
  );
}
