import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createTableCommandInputs } from '~lambda-graphql/dynamodb/schema';
import { Logger } from '~utils/logger';

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
