import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createTableCommandInputs } from '~lambda-graphql/dynamodb/schema';
import { Logger } from '~utils/logging';
import waitPort from 'wait-port';

export async function waitForDynamoDB(endpoint: string, logger: Logger) {
  logger.info('waitForDynamoDB', 'Connecting...');
  const endpointUrl = new URL(endpoint);
  const { open } = await waitPort({
    host: endpointUrl.hostname,
    port: Number(endpointUrl.port),
    path: endpointUrl.pathname,
    timeout: 10000,
    output: 'silent',
  });
  if (!open) {
    throw new Error(`DynamoDB server is not reachable on endpoint "${endpoint}"`);
  }

  logger.info('waitForDynamoDB', `Connected "${endpoint}"`);
}

export async function createLambdaGraphQLDynamoDBTables({
  endpoint,
  logger,
}: {
  endpoint: string;
  logger?: Logger;
}) {
  const client = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint,
    credentials: {
      accessKeyId: 'dummykey123',
      secretAccessKey: 'dummysecretkey123',
    },
    maxAttempts: 5,
  });
  const documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  const maxAttempts = 10;
  const retryDelay = 1000; // ms
  const retryErrorMessages = ['socket hang up', 'read ECONNRESET'];

  const createTableCommands = createTableCommandInputs();
  let attemptNr = 0;
  while (attemptNr++ < maxAttempts) {
    try {
      for (const cmd of createTableCommands) {
        if (!cmd.TableName) {
          throw new Error(`Missing table name`);
        }

        logger?.info('dynamodb:createTable', { TableName: cmd.TableName, attemptNr });

        await deleteTableIfExists(documentClient, cmd.TableName);
        await documentClient.send(new CreateTableCommand(cmd));
      }

      break;
    } catch (error) {
      if (error instanceof Error && retryErrorMessages.includes(error.message)) {
        logger?.info('dynamodb:createTable:retry', { error: error });
        await new Promise((res) => {
          setTimeout(res, retryDelay);
        });
        continue;
      }
      throw error;
    }
  }
}

async function deleteTableIfExists(
  documentClient: DynamoDBDocumentClient,
  TableName: string
) {
  try {
    await documentClient.send(
      new DeleteTableCommand({
        TableName,
      })
    );
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) {
      if (
        (err as Error).message.startsWith(
          'AWS SDK error wrapper for Error: connect ECONNREFUSED'
        )
      ) {
        (err as Error).message +=
          `DynamoDB local is not running on endpoint "${documentClient.config.endpoint?.toString()}"`;
      }
      throw err;
    }
  }
}
