import { PersistentStorage } from 'apollo3-cache-persist';
import { Scalars } from '../../../__generated__/graphql';

export type PersistTypePolicies = Record<string, { persist?: PersistTypePolicy }>;

export interface PersistTypePolicy<
  T extends { id: Scalars['ID']['output']; __typename: string } = {
    id: Scalars['ID']['output'];
    __typename: string;
  },
  TSerializedValue = unknown,
> {
  getCacheKey?: (value: T) => string;

  /**
   * Merges type into existing before persisting.
   */
  writeAllAssign(): (T & TSerializedValue)[];

  /**
   * Modify {@link readValue} to match what was done in {@link writeAllAssign}.
   * Result will be stored in cache.
   */
  readModify(readValue: T & Partial<TSerializedValue>): void;
}

interface NormalizedType {
  id: Scalars['ID']['output'];
  __typename: string;
}

/**
 * Object must have id and __typename
 */
function isNormalizedType(obj: unknown): obj is Record<string, unknown> & NormalizedType {
  return (
    obj != null &&
    typeof obj === 'object' &&
    'id' in obj &&
    (typeof obj.id === 'string' || typeof obj.id === 'number') &&
    '__typename' in obj &&
    typeof obj.__typename === 'string'
  );
}

/**
 * How type is identified in normalized cache (by default type:id).
 */
function defaultGetCacheKey(value: NormalizedType) {
  return `${value.__typename}:${value.id}`;
}

interface TypePersistentStorageParams<T> {
  /**
   * Actual storage used after types have been processed
   */
  storage: PersistentStorage<T>;
  /**
   * Serialize value to correct type
   */
  serialize: (value: unknown) => T;
  /**
   * How to handle serialization of specific type
   * Key is __typename
   */
  typePolicies: PersistTypePolicies;
}

export class TypePersistentStorage<T extends string> implements PersistentStorage<T> {
  private params;

  constructor(params: TypePersistentStorageParams<T>) {
    this.params = params;
  }

  async getItem(key: string): Promise<T | null> {
    const { storage, typePolicies: typePolicies, serialize } = this.params;

    const value = await storage.getItem(key);
    if (!value) return value;

    const valueParsed: unknown = JSON.parse(value);
    if (!valueParsed || typeof valueParsed !== 'object') {
      return value;
    }

    for (const value of Object.values(valueParsed)) {
      if (!isNormalizedType(value)) {
        continue;
      }

      for (const [__typename, typePolicy] of Object.entries(typePolicies)) {
        if (__typename === value.__typename && typePolicy.persist) {
          try {
            typePolicy.persist.readModify(value);
          } catch (err) {
            console.error(
              `Failed to parse ${(typePolicy.persist.getCacheKey ?? defaultGetCacheKey)(
                value
              )}.${err instanceof Error ? ` (${err.message})` : ''}`
            );
          }
        }
      }
    }

    return serialize(valueParsed);
  }
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  setItem(key: string, value: T): void | T | Promise<void> | Promise<T> {
    const { storage, typePolicies, serialize } = this.params;

    const valueUnknown: unknown = JSON.parse(value);
    if (!valueUnknown || typeof valueUnknown !== 'object') {
      return storage.setItem(key, value);
    }

    const valueAsRecord = valueUnknown as Record<string, unknown>;

    Object.values(typePolicies).forEach((typePolicy) => {
      const persist = typePolicy.persist;
      if (persist) {
        persist.writeAllAssign().forEach((value) => {
          const cacheKey = (persist.getCacheKey ?? defaultGetCacheKey)(value);
          const existing = valueAsRecord[cacheKey];
          if (existing != null && typeof existing === 'object') {
            Object.assign(existing, value);
          }
        });
      }
    });

    return storage.setItem(key, serialize(valueAsRecord));
  }
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  removeItem(key: string): void | Promise<void> | Promise<T> {
    const { storage } = this.params;

    return storage.removeItem(key);
  }
}
