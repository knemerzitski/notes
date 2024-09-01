import DataLoader from 'dataloader';

import { callFnGrouped } from '~utils/call-fn-grouped';
import { mergeObjects } from '~utils/object/merge-objects';
import { splitObject } from '~utils/object/split-object';
import { MaybePromise, PickDeep, PickerDeep } from '~utils/types';

import { QueryDeep, QueryResultDeep } from '../query/query';

import { getEqualObjectString } from './utils/get-equal-object-string';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { isQueryArgField } from '../query/merge-queries';
import { Struct, validate } from 'superstruct';
import { pickdeep } from '~utils/superstruct/pickdeep';
import { MongoPrimitive } from '../types';
import { Emitter } from '~utils/mitt-unsub';
import { memoize1 } from '~utils/memoize1';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QueryLoaderEvents<I, Q, QR = Q> = {
  loaded: {
    key: QueryLoaderCacheKey<I, Q>;
    value: QueryResultDeep<QR>;
  };
};

export interface QueryLoaderParams<I, Q, G, R, QR = Q> {
  batchLoadFn: (
    keys: readonly QueryLoaderCacheKey<I, Q>[],
    context: QueryLoaderContext<G, R>
  ) => MaybePromise<(QueryResultDeep<QR> | Error)[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator: Struct<any, any>;
  loaderOptions?: Omit<
    DataLoader.Options<QueryLoaderKey<I, Q, R>, CacheData<QR, unknown>, string>,
    'cacheKeyFn'
  >;
  context?: G;
  eventBus?: Emitter<QueryLoaderEvents<I, Q, QR>>;
}

export interface QueryLoaderContext<G, R> {
  global: G;
  request: R;
}

interface QueryLoaderKey<I, Q, R> {
  cache: QueryLoaderCacheKey<I, Q>;
  context: R;
}

export interface QueryLoaderCacheKey<I, Q> {
  id: I;
  query: QueryDeep<Q> & PickerDeep<Q, MongoPrimitive>;
}

interface LoadOptions<R> {
  context?: R;
  /**
   * Clears cached value before loading again. Cache is refreshed with newest value.
   * @default false;
   */
  skipCache?: boolean;
}

export interface PrimeOptions {
  /**
   * Clears cached value before priming. Ensures new value is inserted in the cahce.
   * @default false;
   */
  clearCache?: boolean;
  /**
   * @default false
   */
  skipEmitEvent?: boolean;
}

export class QueryLoaderError<I, Q extends object> extends Error {
  readonly key: QueryLoaderCacheKey<I, Q>;

  constructor(message: string, key: QueryLoaderCacheKey<I, Q>) {
    super(message);
    this.key = key;
  }
}

function splitQuery<T>(obj: T) {
  if (!isObjectLike(obj)) return [obj];

  return splitObject(obj, {
    keepFn: isQueryArgField,
  });
}

const memoizedGetEqualObjectString = memoize1(getEqualObjectString);

interface CacheData<QR, V> {
  /**
   * Data received from batchLoadFn
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: QueryResultDeep<QR>;
  /**
   * Data after passing through validator
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validated?: V;
}

/**
 * Loads a query by splitting it up by each field for reusable caching.
 * Result values is then merged back together to be returned.
 *
 * I - Identifies the query
 * Q - Query itself
 * G - Global context - common between all loads and supplied during Loader initialization
 * R - Request context - can be different between loads and supplied during load
 * QR - Query result shape
 */
export class QueryLoader<I, Q, G = unknown, R = unknown, QR = Q> {
  private readonly eventBus?: Emitter<QueryLoaderEvents<I, Q, QR>>;
  private readonly loader: DataLoader<
    QueryLoaderKey<I, Q, R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CacheData<QR, any>,
    string
  >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly validator: Struct<any, any>;
  private readonly validatorCache = new Map<string, Struct>();

  constructor(params: QueryLoaderParams<I, Q, G, R, QR>) {
    this.eventBus = params.eventBus;
    this.validator = params.validator;

    this.loader = new DataLoader<
      QueryLoaderKey<I, Q, R>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CacheData<QR, any>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.context,
          (keys, context) => {
            return params.batchLoadFn(
              keys.map((key) => key.cache),
              {
                global: params.context as G,
                request: context,
              }
            );
          }
        ).then((results) =>
          results.map((result) => {
            if (result instanceof Error) {
              return result;
            }
            return {
              raw: result,
            };
          })
        ),
      {
        ...params.loaderOptions,
        cacheKeyFn: (key) => {
          return memoizedGetEqualObjectString(key.cache);
        },
      }
    );
  }

  prime(
    key: QueryLoaderCacheKey<I, Q>,
    value: QueryResultDeep<QR>,
    options?: PrimeOptions
  ) {
    const cacheIsStale = options?.clearCache ?? false;

    splitQuery(key.query).forEach((leafQuery) => {
      const leafLoaderKey: QueryLoaderKey<I, Q, R> = {
        cache: {
          id: key.id,
          query: leafQuery,
        },
        context: null as R,
      };

      if (cacheIsStale) {
        this.loader.clear(leafLoaderKey);
      }

      this.loader.prime(leafLoaderKey, {
        raw: value,
        validated: value,
      });

      if (!options?.skipEmitEvent) {
        this.eventBus?.emit('loaded', {
          key: leafLoaderKey.cache,
          value,
        });
      }
    });
  }

  private getValidatorForQuery(query: QueryLoaderCacheKey<I, Q>['query']) {
    const queryStr = getEqualObjectString(query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let validator: any = this.validatorCache.get(queryStr);
    if (!validator) {
      validator = pickdeep(this.validator, {
        convertObjectToType: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })<MongoPrimitive>()(query as any);
      this.validatorCache.set(queryStr, validator);
    }
    return validator;
  }

  private getValidatedData(
    key: QueryLoaderKey<I, Q, R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: CacheData<QR, any>
  ) {
    if (data.validated !== undefined) {
      return data.validated;
    }

    const [validationErr, validatedResult] = validate(
      data.raw,
      this.getValidatorForQuery(key.cache.query),
      {
        coerce: true,
      }
    );
    data.validated = validationErr ?? validatedResult;

    this.loader.clear(key).prime(key, data);

    return data.validated;
  }

  private getRawData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: CacheData<QR, any>
  ) {
    return data.raw;
  }

  async load<V extends QueryDeep<Q> & PickerDeep<Q, MongoPrimitive>, B extends boolean>(
    key: {
      id: I;
      query: V;
    },
    options?: LoadOptions<R> & {
      validate?: B;
    }
  ): Promise<B extends true ? PickDeep<Q, V, MongoPrimitive> : QueryResultDeep<QR>> {
    const cacheIsStale = options?.skipCache ?? false;
    const validateResult = options?.validate ?? false;

    const splitResults = await Promise.all(
      splitQuery(key.query).map(async (leafQuery) => {
        const leafLoaderKey = {
          cache: {
            id: key.id,
            query: leafQuery,
          },
          context: options?.context as R,
        };

        if (cacheIsStale) {
          this.loader.clear(leafLoaderKey);
        }

        const leafValue = await this.loader.load(leafLoaderKey);

        return {
          leafKey: leafLoaderKey.cache,
          leafValue: validateResult
            ? this.getValidatedData(leafLoaderKey, leafValue)
            : this.getRawData(leafValue),
        };
      })
    );

    const leafValues = splitResults.map((r) => r.leafValue);
    const mergedValue = mergeObjects(leafValues[0], ...leafValues.slice(1));

    for (const { leafKey } of splitResults) {
      this.eventBus?.emit('loaded', {
        key: leafKey,
        value: mergedValue as QueryResultDeep<QR>,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mergedValue as any;
  }
}
