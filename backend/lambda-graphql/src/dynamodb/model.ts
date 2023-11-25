import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { Logger } from '~common/logger';

// import { ReturnValue } from @aws-sdk/client-dynamodb is not available in AWS Lambda
enum ReturnValue {
  ALL_NEW = 'ALL_NEW',
  ALL_OLD = 'ALL_OLD',
  NONE = 'NONE',
  UPDATED_NEW = 'UPDATED_NEW',
  UPDATED_OLD = 'UPDATED_OLD',
}

// import { Select } from @aws-sdk/client-dynamodb is not available in AWS Lambda
enum Select {
  ALL_ATTRIBUTES = 'ALL_ATTRIBUTES',
  ALL_PROJECTED_ATTRIBUTES = 'ALL_PROJECTED_ATTRIBUTES',
  COUNT = 'COUNT',
  SPECIFIC_ATTRIBUTES = 'SPECIFIC_ATTRIBUTES',
}

export interface Table<TKey, TItem> {
  /**
   *
   * @param key
   * @returns Unique item by key
   */
  get(Key: TKey): Promise<TItem | undefined>;

  /**
   * Adds item only if it doesn't exist
   * @param attributes Attributes to compare against existing item
   * @param item
   * @returns Whether item was added or not
   */
  add(attributes: string[], Item: TItem): Promise<boolean>;

  /**
   * Adds or replaces old item with new item if key already exists
   * @param item
   * @returns Old item in table ('undefined' means item was added, otherwise replaced)
   */
  put(Item: TItem): Promise<TItem | undefined>;

  /**
   *
   * @param key
   * @param item
   * @returns Item after update
   */
  update(Key: TKey, item: Partial<TItem>): Promise<TItem | undefined>;

  /**
   *
   * @param options
   * @returns All items based on query
   */
  queryAll(options: Omit<QueryCommandInput, 'TableName' | 'Select'>): Promise<TItem[]>;

  /**
   *
   * @param key
   * @returns Deleted item
   */
  delete(Key: TKey): Promise<TItem | undefined>;
}

export interface NewModelParams {
  documentClient: DynamoDBDocumentClient;
  tableName: string;
  logger: Logger;
}

export function newModel<TKey extends object, TItem extends object>({
  documentClient,
  tableName,
  logger,
}: NewModelParams): Table<TKey, TItem> {
  async function queryOnce(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
    logger.info('queryOnce', { tableName, options });
    try {
      return await documentClient.send(
        new QueryCommand({
          TableName: tableName,
          Select: Select.ALL_ATTRIBUTES,
          ...options,
        })
      );
    } catch (err) {
      logger.error('queryOnce', err as Error);
      throw err;
    }
  }

  async function* query(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
    logger.info('query', { tableName, options });
    try {
      let LastEvaluatedKey: Record<string, unknown> | undefined = undefined;

      do {
        let Items: Record<string, unknown>[] | undefined = undefined;

        ({ Items, LastEvaluatedKey } = await queryOnce({
          ...options,
          ExclusiveStartKey: LastEvaluatedKey,
        }));

        if (Items) {
          for (const item of Items) {
            yield item as TItem;
          }
        }
      } while (LastEvaluatedKey);
    } catch (err) {
      logger.error('query', err as Error);
      throw err;
    }
  }

  return {
    async get(Key: TKey): Promise<TItem | undefined> {
      logger.info('get', { tableName, Key });
      try {
        const { Item } = await documentClient.send(
          new GetCommand({
            TableName: tableName,
            Key: Key as Record<string, unknown>,
          })
        );
        logger.info('get:result', { Item });
        return Item as TItem;
      } catch (err) {
        logger.error('get', err as Error);
        throw err;
      }
    },
    async add(attributes: string[], Item: TItem): Promise<boolean> {
      logger.info('add', { tableName, Item });
      try {
        await documentClient.send(
          new PutCommand({
            TableName: tableName,
            Item: Item as Record<string, unknown>,
            ...getAsAttributeNotExistsExpression(attributes),
          })
        );
        return true;
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
          return false;
        }
        logger.error('add', err as Error);
        throw err;
      }
    },
    async put(Item: TItem): Promise<TItem | undefined> {
      logger.info('put', { tableName, Item });
      try {
        const { Attributes } = await documentClient.send(
          new PutCommand({
            TableName: tableName,
            Item: Item as Record<string, unknown>,
            ReturnValues: ReturnValue.ALL_OLD,
          })
        );
        return Attributes as TItem;
      } catch (err) {
        logger.error('put', err as Error);
        throw err;
      }
    },
    async update(Key: TKey, item: Partial<TItem>): Promise<TItem | undefined> {
      logger.info('update', { tableName, Key, item });
      try {
        type TItemNoKeys = Omit<TItem, keyof TKey>;
        const itemWithoutKeys: TItemNoKeys = Object.entries(item)
          .filter(([key]) => !(key in Key))
          .reduce((acc, [key, val]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            acc[key as keyof TItemNoKeys] = val as TItem[Exclude<
              keyof TItem,
              keyof TKey
            >];
            return acc;
            // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
          }, {} as TItemNoKeys);

        const expression = getAsUpdateExpression(itemWithoutKeys);

        const { Attributes } = await documentClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: Key as Record<string, unknown>,
            ReturnValues: ReturnValue.ALL_NEW,
            ...expression,
          })
        );
        return Attributes as TItem;
      } catch (err) {
        logger.error('update', err as Error);
        throw err;
      }
    },
    async queryAll(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
      const result: TItem[] = [];
      for await (const item of query(options)) {
        result.push(item);
      }
      return result;
    },
    async delete(Key: TKey): Promise<TItem | undefined> {
      logger.info('delete', { tableName, Key });
      try {
        const { Attributes } = await documentClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: Key as Record<string, unknown>,
            ReturnValues: ReturnValue.ALL_OLD,
          })
        );
        return Attributes as TItem;
      } catch (err) {
        logger.error('delete', err as Error);
        throw err;
      }
    },
  };
}

function getAsAttributeNotExistsExpression(names: string[]) {
  const updateExpressionParts: string[] = [];
  const ExpressionAttributeNames: Record<string, string> = {};

  let counter = 0;
  for (const name of names) {
    const namePlaceholder = `#${counter}`;

    updateExpressionParts.push(`attribute_not_exists(${namePlaceholder})`);
    ExpressionAttributeNames[namePlaceholder] = name;

    counter++;
  }

  return {
    ConditionExpression: `${updateExpressionParts.join(' AND ')}`,
    ExpressionAttributeNames,
  };
}

/**
 * Ignores undefined values
 */
function getAsUpdateExpression(obj: Record<string, unknown>) {
  const updateExpressionParts: string[] = [];
  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, unknown> = {};

  let counter = 0;
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      continue;
    }
    const namePlaceholder = `#${counter}`;
    const valuePlaceholder = `:${counter}`;

    updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
    ExpressionAttributeNames[namePlaceholder] = key;
    ExpressionAttributeValues[valuePlaceholder] = obj[key];

    counter++;
  }

  return {
    UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
}
