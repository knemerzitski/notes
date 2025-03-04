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

import { Logger } from '../../../utils/src/logging';

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
   * @param options
   * @param filter All items that partially match filter.
   * A nested structure with only primitive values: string, number, boolean.
   * Cannot contain any circular references.
   * DynamoDB maximum depth for document path is 32.
   *
   * E.g
   * Queried list of names:
   * [
   *  {
   *    first: 'John',
   *    last: 'Doe
   *  },
   *  {
   *    first: 'Anna',
   *    last: 'Ann'
   *  }
   * ]
   *
   * With filter:
   *  {
   *    last: 'Ann'
   *  }
   *
   * Will return:
   * [
   *  {
   *    first: 'Anna',
   *    last: 'Ann'
   *  }
   * ]
   * @param prefix Prepened to all filter expression attribute names
   */
  queryAllFilter(
    options: Omit<QueryCommandInput, 'TableName' | 'Select' | 'FilterExpression'>,
    filter: Record<string, unknown>,
    prefix?: string
  ): Promise<TItem[]>;

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
      logger.error('query', err);
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
        logger.error('get', err);
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
        logger.error('add', err);
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
        logger.error('put', err);
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
            acc[key as keyof TItemNoKeys] = val as TItem[Exclude<
              keyof TItem,
              keyof TKey
            >];
            return acc;
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
        logger.error('update', err);
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
    async queryAllFilter(options, filter, prefix) {
      const filterExpression = getAsFilterExpression(filter, prefix);

      const result: TItem[] = [];
      for await (const item of query({
        ...options,
        ExpressionAttributeNames: {
          ...options.ExpressionAttributeNames,
          ...filterExpression.ExpressionAttributeNames,
        },
        ExpressionAttributeValues: {
          ...options.ExpressionAttributeValues,
          ...filterExpression.ExpressionAttributeValues,
        },
        FilterExpression: filterExpression.FilterExpression,
      })) {
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
        logger.error('delete', err);
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
    ConditionExpression: updateExpressionParts.join(' AND '),
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

/**
 *
 * @param filter
 * @param prefix Prepended to all filter expression attribute names.
 * Can target a specific attribute of an object with a sub filter.
 * @returns
 */
function getAsFilterExpression(filterObj: Record<string, unknown>, prefix?: string) {
  const ExpressionAttributeNames: Record<string, string> = {};

  const keyIndex: Record<string, number> = {};
  let keyCounter = 0;
  function mapKey(key: string) {
    if (!(key in keyIndex)) {
      keyIndex[key] = keyCounter++;
    }

    const namePlaceholder = `#${keyIndex[key]}`;
    ExpressionAttributeNames[namePlaceholder] = key;

    return namePlaceholder;
  }

  let prefixPlaceholderWithDot = '';
  if (prefix) {
    prefixPlaceholderWithDot =
      prefix
        .split('.')
        .map((p) => mapKey(p))
        .join('.') + '.';
  }
  const filter = flattenKeys(filterObj, { mapKey, separator: '.' });

  const filterExpressionParts: string[] = [];
  const ExpressionAttributeValues: Record<string, string | number | boolean> = {};

  const seenAttributeNames = new Set(
    prefixPlaceholderWithDot.split('.').filter((key) => Boolean(key))
  );
  let valueCounter = 0;
  for (const [namePlaceholder, value] of Object.entries(filter)) {
    const valuePlaceholder = `:${valueCounter++}`;
    ExpressionAttributeValues[valuePlaceholder] = value;
    namePlaceholder.split('.').forEach((namePart) => seenAttributeNames.add(namePart));

    const expressionName = `${prefixPlaceholderWithDot}${namePlaceholder}`;

    filterExpressionParts.push(
      `(${expressionName} = ${valuePlaceholder} OR attribute_not_exists(${expressionName}))`
    );
  }

  //Delete unused ExpressionAttributeNames
  for (const name of Object.keys(ExpressionAttributeNames)) {
    if (!seenAttributeNames.has(name)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete ExpressionAttributeNames[name];
    }
  }

  return {
    FilterExpression: filterExpressionParts.join(' AND '),
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
}

interface FlattenKeysConfig {
  /**
   * Maps every key once to value returned. By default identity mapper is used.
   * @param key
   * @returns Mapped key
   */
  mapKey?: (key: string) => string;
  /**
   * Keys joined by separator
   */
  separator?: string;
  /**
   * Used in recursive calls to keep track which keys have been mapped.
   */
  keysMapped?: boolean;
}

/**
 *
 * @param obj A nested object
 * @param config
 * @returns A flattened object
 */
function flattenKeys(
  obj: Record<string, unknown>,
  config: FlattenKeysConfig | undefined = {}
): Record<string, number | string | boolean> {
  const { mapKey = (s) => s, separator = '.', keysMapped = false } = config;
  const flatObj: Record<string, number | string | boolean> = {};

  for (const [mightBeMappedKey, value] of Object.entries(obj)) {
    const mappedKey = keysMapped ? mightBeMappedKey : mapKey(mightBeMappedKey);

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      flatObj[mappedKey] = value;
    } else if (value && typeof value === 'object') {
      const innerFlatObj: Record<string, unknown> = {};

      for (const [key2, value2] of Object.entries(value)) {
        innerFlatObj[`${mappedKey}${separator}${mapKey(key2)}`] = value2;
      }

      for (const [key, value] of Object.entries(
        flattenKeys(innerFlatObj, { mapKey, separator, keysMapped: true })
      )) {
        flatObj[key] = value;
      }
    }
  }

  return flatObj;
}
