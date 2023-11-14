import { CreateTableCommandInput, KeyType } from '@aws-sdk/client-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  GlobalSecondaryIndexProps,
  ProjectionType,
  Table,
  TableProps,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface SchemaProps {
  table: TableProps;
  globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
}

interface Schema {
  connections: SchemaProps;
  subscriptions: SchemaProps;
}

/**
 * Normalized structure that works for CDK deployment and local DynamoDB container
 */
const schema: Schema = {
  connections: {
    table: {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
    },
  },
  subscriptions: {
    table: {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
    },
    globalSecondaryIndexes: [
      {
        indexName: 'ConnectionIndex',
        projectionType: ProjectionType.ALL,
        partitionKey: {
          name: 'connectionId',
          type: AttributeType.STRING,
        },
      },
      {
        indexName: 'TopicIndex',
        projectionType: ProjectionType.ALL,
        partitionKey: {
          name: 'topic',
          type: AttributeType.STRING,
        },
      },
    ],
  },
};

/**
 * @param scope
 * @param id
 * @returns Table constructs to be used by CDK for deployment
 */
export function createCdkTableConstructs(
  scope: Construct,
  id?: string
): Record<keyof Schema, Table> {
  const result: Record<string, Table> = {};
  for (const tableId of Object.keys(schema)) {
    const props = schema[tableId as keyof Schema];

    const table = new Table(scope, id ? `${id}-${tableId}` : tableId, props.table);
    props.globalSecondaryIndexes?.forEach((gsi) => table.addGlobalSecondaryIndex(gsi));

    result[tableId] = table;
  }
  return result;
}

/**
 * This function is meant to be used only for mocking.
 * @returns Inputs to create DynamoDB tables directly using local DynamoDB client
 */
export function createTableCommandInputs(): CreateTableCommandInput[] {
  const result: CreateTableCommandInput[] = [];

  for (const tableId of Object.keys(schema)) {
    const props = schema[tableId as keyof Schema];
    const { billingMode, partitionKey } = props.table;
    const globalSecondaryIndexes = props.globalSecondaryIndexes ?? [];

    const cmd: CreateTableCommandInput = {
      BillingMode: billingMode,
      TableName: tableId,
      KeySchema: [
        {
          AttributeName: partitionKey.name,
          KeyType: KeyType.HASH,
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: partitionKey.name,
          AttributeType: partitionKey.type,
        },
      ],
    };

    if (props.globalSecondaryIndexes && props.globalSecondaryIndexes.length > 0) {
      cmd.AttributeDefinitions?.push(
        ...globalSecondaryIndexes.map((gsi) => ({
          AttributeName: gsi.partitionKey.name,
          AttributeType: gsi.partitionKey.type,
        }))
      );

      cmd.GlobalSecondaryIndexes = [
        ...globalSecondaryIndexes.map((gsi) => ({
          IndexName: gsi.indexName,
          Projection: {
            ProjectionType: gsi.projectionType,
          },
          KeySchema: [
            {
              AttributeName: gsi.partitionKey.name,
              KeyType: KeyType.HASH,
            },
          ],
        })),
      ];
    }

    result.push(cmd);
  }

  return result;
}
