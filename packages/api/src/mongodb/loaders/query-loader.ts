import DataLoader from 'dataloader';

import { callFnGrouped } from '~utils/call-fn-grouped';
import { Emitter } from '~utils/mitt-unsub';
import { mergeObjects } from '~utils/object/merge-objects';
import { splitObject } from '~utils/object/split-object';
import { MaybePromise } from '~utils/types';

import { DeepQuery, DeepQueryResult } from '../query/query';

import { getEqualObjectString } from './utils/get-equal-object-string';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { isQueryArgField } from '../query/merge-queries';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QueryLoaderEvents<I, Q extends object, QR = Q> = {
  loaded: {
    key: QueryLoaderCacheKey<I, Q>;
    value: DeepQueryResult<QR>;
  };
};

export interface QueryLoaderParams<I, Q extends object, G, R, QR = Q> {
  batchLoadFn: (
    keys: readonly QueryLoaderCacheKey<I, Q>[],
    context: QueryLoaderContext<G, R>
  ) => MaybePromise<(DeepQueryResult<QR> | Error | null)[]>;
  loaderOptions?: Omit<
    DataLoader.Options<QueryLoaderKey<I, Q, R>, DeepQueryResult<QR>, string>,
    'cacheKeyFn'
  >;
  context?: G;
  eventBus?: Emitter<QueryLoaderEvents<I, Q, QR>>;
}

export interface QueryLoaderContext<G, R> {
  global: G;
  request: R;
}

interface QueryLoaderKey<I, Q extends object, R> {
  cache: QueryLoaderCacheKey<I, Q>;
  context: R;
}

export interface QueryLoaderCacheKey<I, Q extends object> {
  id: I;
  query: DeepQuery<Q>;
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
}

function splitQuery<T>(obj: T) {
  if (!isObjectLike(obj)) return [obj];

  return splitObject(obj, {
    keepFn: isQueryArgField,
  });
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
export class QueryLoader<I, Q extends object, G, R, QR = Q> {
  private readonly eventBus?: Emitter<QueryLoaderEvents<I, Q, QR>>;
  private readonly loader: DataLoader<
    QueryLoaderKey<I, Q, R>,
    DeepQueryResult<QR> | null,
    string
  >;

  constructor(params: QueryLoaderParams<I, Q, G, R, QR>) {
    this.eventBus = params.eventBus;
    this.loader = new DataLoader<
      QueryLoaderKey<I, Q, R>,
      DeepQueryResult<QR> | null,
      string
    >(
      (keys) =>
        callFnGrouped(
          keys,
          (key) => key.context,
          (keys, context) =>
            params.batchLoadFn(
              keys.map((key) => key.cache),
              {
                global: params.context as G,
                request: context,
              }
            )
        ),
      {
        ...params.loaderOptions,
        cacheKeyFn: (key) => {
          return getEqualObjectString(key.cache);
        },
      }
    );
  }

  prime(
    key: QueryLoaderCacheKey<I, Q>,
    value: DeepQueryResult<QR>,
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
      this.loader.prime(leafLoaderKey, value);

      this.eventBus?.emit('loaded', {
        key: leafLoaderKey.cache,
        value,
      });
    });
  }

  async load(
    key: QueryLoaderCacheKey<I, Q>,
    options?: LoadOptions<R>
  ): Promise<DeepQueryResult<QR> | undefined> {
    const cacheIsStale = options?.skipCache ?? false;
    const leafResults = await Promise.all(
      splitQuery(key.query).map(async (leafQuery) => {
        const leafLoaderKey: QueryLoaderKey<I, Q, R> = {
          cache: {
            id: key.id,
            query: leafQuery,
          },
          context: options?.context as R,
        };

        if (cacheIsStale) {
          this.loader.clear(leafLoaderKey);
        }

        const leafResult = await this.loader.load(leafLoaderKey);
        if (leafResult != null) {
          this.eventBus?.emit('loaded', {
            key: leafLoaderKey.cache,
            value: leafResult,
          });
        }

        return leafResult;
      })
    );

    return mergeObjects(leafResults[0], ...leafResults.slice(1)) as DeepQueryResult<QR>;
  }
}
