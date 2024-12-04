/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  CreateTableCommand,
  DeleteTableCommand,
  KeyType,
  ResourceNotFoundException,
  ScalarAttributeType,
  TableStatus,
  BillingMode,
  ProjectionType,
} from '@aws-sdk/client-dynamodb';
import { faker } from '@faker-js/faker';
import { beforeAll, it, expect, beforeEach } from 'vitest';

import { mock } from 'vitest-mock-extended';

import { Logger } from '~utils/logging';

import { dynamoDBDocumentClient } from '../__tests__/helpers/dynamodb';

import { newModel, Table } from './model';

let table: Table<{ id: string }, Record<string, unknown>>;

function newItem() {
  return {
    id: faker.string.uuid(),
    connectionId: `connection:${faker.string.uuid()}`,
    simpleAttr: faker.string.sample(),
    nestedAttr: {
      first: faker.string.sample(),
    },
    deeplyNestedAttr: {
      one: faker.string.sample(),
      two: {
        twoNested: faker.string.sample(),
      },
    },
    undefinedValue: undefined,
  };
}

function asSavedItem<T extends { undefinedValue: undefined }>(
  item: T
): Omit<T, 'undefinedValue'> {
  const savedItem = {
    ...item,
  };
  delete savedItem.undefinedValue;

  return savedItem;
}

beforeAll(() => {
  faker.seed(89);
});

beforeEach(async () => {
  const tableName = 'test-table';

  table = newModel({
    documentClient: dynamoDBDocumentClient,
    tableName,
    logger: mock<Logger>(),
  });

  // Delete existing table
  try {
    await dynamoDBDocumentClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
  } catch (err) {
    // All good if table already doesn't exist
    if (!(err instanceof ResourceNotFoundException)) {
      if (
        (err as Error).message.startsWith(
          'AWS SDK error wrapper for Error: connect ECONNREFUSED'
        )
      ) {
        (err as Error).message += ` (Run "npm run db:start" before tests)`;
      }
      throw err;
    }
  }

  // Create new table
  const createTableOuput = await dynamoDBDocumentClient.send(
    new CreateTableCommand({
      BillingMode: BillingMode.PAY_PER_REQUEST,
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: KeyType.HASH,
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: ScalarAttributeType.S,
        },
        {
          AttributeName: 'connectionId',
          AttributeType: ScalarAttributeType.S,
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ConnectionIndex',
          Projection: {
            ProjectionType: ProjectionType.ALL,
          },
          KeySchema: [
            {
              AttributeName: 'connectionId',
              KeyType: KeyType.HASH,
            },
          ],
        },
      ],
    })
  );
  expect(createTableOuput.TableDescription?.TableStatus).toBe(TableStatus.ACTIVE);
});

it('adds item to db only once, returns false on subsequent adds', async () => {
  const item = newItem();
  const savedItem = asSavedItem(item);
  const differentButSameIdItem = newItem();
  differentButSameIdItem.id = item.id;

  const key = ['id'];

  expect(await table.add(key, item)).toBe(true);
  expect(
    await table.get({
      id: item.id,
    })
  ).toStrictEqual(savedItem);

  await table.add(key, differentButSameIdItem);
  expect(await table.add(key, differentButSameIdItem)).toBe(false);
  expect(
    await table.get({
      id: item.id,
    })
  ).toStrictEqual(savedItem);
});

it('puts to db and gets item with same content', async () => {
  const item = newItem();
  const savedItem = asSavedItem(item);

  await table.put(item);

  const getItem = await table.get({
    id: item.id,
  });
  expect(getItem).not.toBe(savedItem);
  expect(getItem).toStrictEqual(savedItem);
});

it('second put returns item indicating that item already exists', async () => {
  const putTwiceItem = newItem();
  const savedItem = asSavedItem(putTwiceItem);

  expect(await table.put(putTwiceItem)).toBeUndefined();
  expect(await table.put(putTwiceItem)).toStrictEqual(savedItem);
});

it('updates only single attribute without altering other attributes', async () => {
  const item = newItem();
  const simpleDiffItem = asSavedItem({ ...item, simpleAttr: faker.string.sample() });

  await table.put(item);

  const updatedItem = await table.update(
    { id: item.id },
    {
      simpleAttr: simpleDiffItem.simpleAttr,
    }
  );
  expect(updatedItem).toStrictEqual(simpleDiffItem);

  const getItem = await table.get({
    id: item.id,
  });
  expect(getItem).toStrictEqual(simpleDiffItem);
});

it('updates whole item', async () => {
  const item = newItem();
  const diffItem = {
    ...item,
    simpleAttr: faker.string.sample(),
    nestedAttr: {
      replacedFirst: faker.string.sample(),
    },
  };
  const savedDiffItem = asSavedItem(diffItem);

  await table.put(item);

  const updatedItem = await table.update({ id: diffItem.id }, diffItem);
  expect(updatedItem).toStrictEqual(savedDiffItem);

  const getItem = await table.get({
    id: item.id,
  });
  expect(getItem).toStrictEqual(savedDiffItem);
});

it('queries by secondary global index', async () => {
  // Two items with same secondary global index
  const item1 = newItem();
  const item2 = newItem();
  item2.connectionId = item1.connectionId;

  // 1MB = 1000kb = 1000000b

  const otherItem1 = newItem();

  await Promise.all([table.put(item1), table.put(item2), table.put(otherItem1)]);

  const items = await table.queryAll({
    IndexName: 'ConnectionIndex',
    ExpressionAttributeNames: {
      '#conn': 'connectionId',
    },
    ExpressionAttributeValues: {
      ':val': item1.connectionId,
    },
    KeyConditionExpression: '#conn = :val',
  });

  expect(items.length).toBe(2);
  expect(items).toEqual(expect.arrayContaining([item1, item2]));
});

it('collects query responses larger than 1MB', async () => {
  const item = newItem();
  item.simpleAttr = faker.string.sample({ min: 409000, max: 409000 });
  const expectedItems = [...Array(4).keys()].map(() => ({
    ...item,
    id: faker.string.uuid(),
  }));

  await Promise.all(expectedItems.map((item) => table.put(item)));

  const items = await table.queryAll({
    IndexName: 'ConnectionIndex',
    ExpressionAttributeNames: {
      '#conn': 'connectionId',
    },
    ExpressionAttributeValues: {
      ':val': item.connectionId,
    },
    KeyConditionExpression: '#conn = :val',
  });

  expect(items.length).toBe(expectedItems.length);
  expect(items).toEqual(expect.arrayContaining(expectedItems));
});

it('querying by index for non-existent item returns empty array', async () => {
  const items = await table.queryAll({
    IndexName: 'ConnectionIndex',
    ExpressionAttributeNames: {
      '#conn': 'connectionId',
    },
    ExpressionAttributeValues: {
      ':val': 'never',
    },
    KeyConditionExpression: '#conn = :val',
  });

  expect(items.length).toBe(0);
});

it('deletes item', async () => {
  const item = newItem();

  await table.put(item);

  await table.delete({ id: item.id });

  const afterDeleteItem = await table.get({
    id: item.id,
  });
  expect(afterDeleteItem).toBeUndefined();
});

it('update keeps already existing content', async () => {
  const item = {
    id: 'partial-item',
    first: 'one',
  };

  await table.put(item);
  const getItem = await table.get({
    id: item.id,
  });
  expect(getItem).toStrictEqual({
    id: 'partial-item',
    first: 'one',
  });

  const item2 = {
    id: 'partial-item',
    second: 'two',
  };

  await table.update({ id: item2.id }, item2);
  const getItem2 = await table.get({
    id: item2.id,
  });
  expect(getItem2).toStrictEqual({
    id: 'partial-item',
    first: 'one',
    second: 'two',
  });
});

it('query by filter', async () => {
  const item = newItem();
  item.connectionId = 'common';
  item.simpleAttr = 'i wont be queried';
  await table.put(item);

  const item2 = newItem();
  item2.connectionId = 'common';
  item2.simpleAttr = 'i will be queried';
  await table.put(item2);
  const savedItem2 = asSavedItem(item2);

  const items = await table.queryAllFilter(
    {
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#conn': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':val': 'common',
      },
      KeyConditionExpression: '#conn = :val',
    },
    {
      simpleAttr: 'i will be queried',
    }
  );

  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(savedItem2);
});

it('query by filter nested', async () => {
  const item = newItem();
  item.connectionId = 'common';
  (item.simpleAttr = 'hello'), (item.deeplyNestedAttr.one = 'ok');
  item.deeplyNestedAttr.two.twoNested = 'ignore me';
  await table.put(item);

  const item2 = newItem();
  item2.connectionId = 'common';
  (item2.simpleAttr = 'hello'), (item2.deeplyNestedAttr.one = 'ok');
  item2.deeplyNestedAttr.two.twoNested = 'find me';
  await table.put(item2);
  const savedItem2 = asSavedItem(item2);

  const items = await table.queryAllFilter(
    {
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#connectionId': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':common': 'common',
      },
      KeyConditionExpression: '#connectionId = :common',
    },
    {
      simple: 'hello',
      deeplyNestedAttr: {
        one: 'ok',
        two: {
          twoNested: 'find me',
        },
      },
    }
  );

  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(savedItem2);
});
