import { InMemoryCache, Reference, StoreObject } from '@apollo/client';
import { PersistentStorage } from 'apollo3-cache-persist';

import { isObjectLike } from '~utils/type-guards/is-object-like';

export type PersistTypePolicies = Record<string, TypePolicy>;

interface TypePolicy {
  persist?: Persist;
}

interface Persist {
  /**
   * Add additional fields to type whent persisting.
   * Returned object is shallow assigned to the type.
   */
  writeAllAssign?: (options: { cache: InMemoryCache }) => (Reference | StoreObject)[];

  /**
   * Modify or access {@link value} when it's restored from persistence.
   */
  readModify?: (value: unknown, options: { cache: InMemoryCache }) => void;
}

export class TypePoliciesPersistentStorage<T extends string>
  implements PersistentStorage<T>
{
  private readonly cache;
  private readonly storage;
  private readonly serialize;
  private readonly typePolicies;

  private readonly callbackOptions;

  constructor({
    cache,
    storage,
    serialize,
    typePolicies,
  }: {
    cache: InMemoryCache;
    /**
     * How to handle serialization of a specific type
     * Key is __typename
     */
    typePolicies: PersistTypePolicies;
    /**
     * Actual storage
     */
    storage: PersistentStorage<T>;
    /**
     * Serialize value for storage
     */
    serialize: (value: unknown) => T;
  }) {
    this.cache = cache;
    this.storage = storage;
    this.serialize = serialize;

    this.typePolicies = typePolicies;

    this.callbackOptions = { cache };
  }

  async getItem(key: string): Promise<T | null> {
    const serializedValue = await this.storage.getItem(key);
    if (!serializedValue) return serializedValue;

    const valueUnknown: unknown = JSON.parse(serializedValue);
    if (!isObjectLike(valueUnknown)) {
      return serializedValue;
    }

    for (const value of Object.values(valueUnknown)) {
      if (!isObjectLike(value) || typeof value.__typename !== 'string') {
        continue;
      }

      const typePolicy = this.typePolicies[value.__typename];
      if (!typePolicy?.persist?.readModify) {
        continue;
      }

      try {
        typePolicy.persist.readModify(value, this.callbackOptions);
      } catch (err) {
        console.error(
          `Failed to parse ${String(value)} ${err instanceof Error ? ` (${err.message})` : ''}`
        );
      }
    }

    return this.serialize(valueUnknown);
  }
  setItem(key: string, value: T): void | T | Promise<void> | Promise<T> {
    const valueUnknown: unknown = JSON.parse(value);
    if (!isObjectLike(valueUnknown)) {
      return this.storage.setItem(key, value);
    }
    const valueObject = valueUnknown;

    for (const typePolicy of Object.values(this.typePolicies)) {
      if (!typePolicy.persist?.writeAllAssign) {
        continue;
      }

      typePolicy.persist.writeAllAssign(this.callbackOptions).forEach((value) => {
        const cacheKey = this.cache.identify(value);
        if (!cacheKey) {
          return;
        }

        const existingValue = valueObject[cacheKey];
        if (isObjectLike(existingValue)) {
          Object.assign(existingValue, value);
        }
      });
    }

    return this.storage.setItem(key, this.serialize(valueObject));
  }
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  removeItem(key: string): void | Promise<void> | Promise<T> {
    return this.storage.removeItem(key);
  }
}
