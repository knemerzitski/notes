import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import waitPort from 'wait-port';

import { assertDynamoDBIsReachable } from '../../../lambda-graphql/src/__tests__/helpers/dynamodb';
import { createTableCommandInputs } from '../../../lambda-graphql/src/dynamodb/schema';
import { Logger } from '../../../utils/src/logging';

export async function waitForDynamoDBPort(endpoint: string, logger: Logger) {
  logger.info('waitForDynamoDBPort', 'Connecting...');
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

  logger.info('waitForDynamoDBPort', `Connected "${endpoint}"`);
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
  });
  const documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  await assertDynamoDBIsReachable(documentClient);

  const createTableCommands = createTableCommandInputs();
  for (const cmd of createTableCommands) {
    if (!cmd.TableName) {
      throw new Error(`Missing table name`);
    }

    logger?.info('dynamodb:createTable', { TableName: cmd.TableName });

    await deleteTableIfExists(documentClient, cmd.TableName);
    await documentClient.send(new CreateTableCommand(cmd));
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
