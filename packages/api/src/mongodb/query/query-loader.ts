import DataLoader, { CacheMap } from 'dataloader';

import { callFnGrouped } from '~utils/call-fn-grouped';
import { mergedObjects } from '~utils/object/merge-objects';
import { splitObject } from '~utils/object/split-object';
import { Maybe, MaybePromise } from '~utils/types';

import {
  MongoQueryFn,
  PartialQueryResultDeep,
  QueryDeep,
  QueryResultDeep,
} from './query';

import { memoizedGetEqualObjectString } from './utils/get-equal-object-string';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { isQueryArgField } from './merge-queries';
import { Infer, InferRaw, Struct } from 'superstruct';
import { Emitter } from 'mitt';
import { zip } from '~utils/array/zip';
import { valueToQueries } from './utils/value-to-query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueryLoaderEvents<I, S extends Struct<any, any, any>> {
  loaded: Readonly<{
    key: QueryLoaderCacheKey<I, QueryDeep<Infer<S>>>;
    value: PartialQueryResultDeep<Infer<S>>;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueryLoaderParams<I, S extends Struct<any, any, any>, CG, CR> {
  batchLoadFn: (
    keys: readonly QueryLoaderKey<I, Infer<S>, CR>['cache'][],
    context: QueryLoaderContext<CG, CR>
  ) => MaybePromise<(PartialQueryResultDeep<InferRaw<S>> | Error)[]>;
  struct: S;
  loaderOptions?: Omit<
    DataLoader.Options<
      QueryLoaderKey<I, Infer<S>, CR>,
      PartialQueryResultDeep<Infer<S>>,
      string
    >,
    'cacheKeyFn'
  >;
  context?: CG;
  eventBus?: Emitter<QueryLoaderEvents<I, S>>;
}

export interface QueryLoaderContext<CG, CR> {
  global: CG;
  request: CR;
}

export interface QueryLoaderKey<I, Q, CR> {
  cache: QueryLoaderCacheKey<I, QueryDeep<Q>>;
  context: CR;
}

interface QueryLoaderCacheKey<I, Q> {
  id: I;
  query: Q;
}

export interface LoadOptions<R> {
  context?: R;
  /**
   * Clears cached value before loading again. Cache is refreshed with newest value.
   * @default false;
   */
  clearCache?: boolean;
}

export interface PrimeOptions<S> {
  /**
   * Skip clearing cached value before priming. If skipping and value already exists then
   * provided value is not inserted in the cache.
   * @default false;
   */
  skipClearCache?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueToQueryOptions?: Parameters<typeof valueToQueries<S, any>>[1];
}

export type SessionOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends LoadOptions<any> | PrimeOptions<any> | CreateQueryFnOptions<any, any>,
> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: T extends LoadOptions<infer R> | CreateQueryFnOptions<infer R, any>
    ? R
    : never;
} & Omit<T, 'context' | 'clearCache'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateQueryFnOptions<R, Q> extends LoadOptions<R> {
  mapQuery?: <V extends QueryDeep<Q>>(query: V) => Maybe<V>;
}

export class QueryLoaderError<I, Q extends object> extends Error {
  readonly key: QueryLoaderCacheKey<I, QueryDeep<Q>>;

  constructor(message: string, key: QueryLoaderCacheKey<I, QueryDeep<Q>>) {
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

/**
 * Loads a query by splitting it up by each field for reusable caching.
 * Result values is then merged back together to be returned.
 *
 * I - Identifies the query
 * S - Result structure
 * CG - Context global - Context passed during loader initialization and stays constant between requests.
 * CR - Context request - Can be unque for each load call.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryLoader<I, S extends Struct<any, any, any>, CG = unknown, CR = unknown> {
  private readonly eventBus?: Emitter<QueryLoaderEvents<I, S>>;
  private readonly loader: DataLoader<
    QueryLoaderKey<I, Infer<S>, CR>,
    PartialQueryResultDeep<Infer<S>>,
    string
  >;

  private readonly loaderCacheMap: CacheMap<
    string,
    Promise<PartialQueryResultDeep<Infer<S>>>
  >;

  constructor(params: QueryLoaderParams<I, S, CG, CR>) {
    this.eventBus = params.eventBus;

    const struct = params.struct;

    this.loaderCacheMap = params.loaderOptions?.cacheMap ?? new Map();

    this.loader = new DataLoader<
      QueryLoaderKey<I, Infer<S>, CR>,
      PartialQueryResultDeep<Infer<S>>,
      string
    >(
      async (keys) => {
        const results = await callFnGrouped(
          keys,
          (key) => key.context,
          (keys, context) => {
            return params.batchLoadFn(
              keys.map((key) => key.cache),
              {
                global: params.context as CG,
                request: context,
              }
            );
          }
        );

        return [...zip(keys, results)].map(([key, result]) => {
          if (result instanceof Error) {
            return result;
          }

          const [error, value] = struct.validate(result, {
            coerce: true,
            validation: key.cache.query,
          });

          return error ?? value;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any;
      },
      {
        ...params.loaderOptions,
        cacheMap: this.loaderCacheMap,
        cacheKeyFn: (key) => memoizedGetEqualObjectString(key.cache),
      }
    );
  }

  /**
   * Prevent cyclic emitting same loaded value using a Set
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly emitLoadedIds = new Set<any>();

  private emitLoaded(payload: QueryLoaderEvents<I, S>['loaded']) {
    const result = payload.value;
    if (this.emitLoadedIds.has(result)) return;
    try {
      this.emitLoadedIds.add(result);
      this.eventBus?.emit('loaded', payload);
    } finally {
      this.emitLoadedIds.delete(result);
    }
  }

  prime(
    key: Omit<QueryLoaderCacheKey<I, QueryDeep<Infer<S>>>, 'query'> & {
      query?: QueryDeep<Infer<S>> | QueryDeep<Infer<S>>[];
    },
    value: PartialQueryResultDeep<Infer<S>>,
    options?: PrimeOptions<Infer<S>>
  ) {
    const cacheIsStale = options?.skipClearCache ?? true;

    const queries = key.query
      ? Array.isArray(key.query)
        ? key.query
        : [key.query]
      : valueToQueries(value, options?.valueToQueryOptions);

    for (const query of queries) {
      splitQuery(query).forEach((leafQuery) => {
        const leafLoaderKey: QueryLoaderKey<I, Infer<S>, CR> = {
          cache: {
            id: key.id,
            query: leafQuery,
          },
          context: null as CR,
        };

        let isAlreadyCached = false;
        if (cacheIsStale) {
          this.loader.clear(leafLoaderKey);
        } else {
          isAlreadyCached = this.isKeyCached(leafLoaderKey.cache);
        }

        this.loader.prime(leafLoaderKey, value);

        if (!isAlreadyCached) {
          this.emitLoaded({
            key: leafLoaderKey.cache,
            value,
          });
        }
      });
    }
  }

  async load<V extends QueryDeep<Infer<S>>>(
    key: QueryLoaderCacheKey<I, V>,
    options?: LoadOptions<CR>
  ): Promise<QueryResultDeep<Infer<S>, V>> {
    const cacheIsStale = options?.clearCache ?? false;

    const splitResults = await Promise.all(
      splitQuery(key.query).map(async (leafQuery) => {
        const leafLoaderKey = {
          cache: {
            id: key.id,
            query: leafQuery,
          },
          context: options?.context as CR,
        };

        let isAlreadyCached = false;
        if (cacheIsStale) {
          this.loader.clear(leafLoaderKey);
        } else {
          isAlreadyCached = this.isKeyCached(leafLoaderKey.cache);
        }

        const leafValue = await this.loader.load(leafLoaderKey);

        return {
          leafKey: leafLoaderKey.cache,
          leafValue: leafValue,
          isAlreadyCached,
        };
      })
    );

    const leafValues = splitResults.map((r) => r.leafValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedValue: any = mergedObjects(...leafValues);

    for (const { isAlreadyCached, leafKey } of splitResults) {
      if (isAlreadyCached) {
        continue;
      }

      this.emitLoaded({
        key: leafKey,
        value: mergedValue,
      });
    }

    return mergedValue;
  }

  createQueryFn(
    id: I,
    options?: CreateQueryFnOptions<CR, Infer<S>>
  ): MongoQueryFn<Infer<S>> {
    return <V extends QueryDeep<Infer<S>>>(query: V) => {
      query = options?.mapQuery?.(query) ?? query;

      return this.load(
        {
          id,
          query,
        },
        {
          ...options,
        }
      );
    };
  }

  private isKeyCached<Q>(cacheKey: QueryLoaderCacheKey<I, Q>) {
    return this.loaderCacheMap.get(memoizedGetEqualObjectString(cacheKey)) != null;
  }
}
