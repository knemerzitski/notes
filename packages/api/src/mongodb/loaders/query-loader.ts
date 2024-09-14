import DataLoader, { CacheMap } from 'dataloader';

import { callFnGrouped } from '~utils/call-fn-grouped';
import { mergedObjects } from '~utils/object/merge-objects';
import { splitObject } from '~utils/object/split-object';
import { Maybe, MaybePromise, PartialBy } from '~utils/types';

import {
  MongoQueryFn,
  PartialQueryResultDeep,
  QueryDeep,
  QueryResultDeep,
} from '../query/query';

import { memoizedGetEqualObjectString } from './utils/get-equal-object-string';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { isQueryArgField } from '../query/merge-queries';
import { Infer, InferRaw, Struct } from 'superstruct';
import { Emitter } from '~utils/mitt-unsub';
import { StructQuery } from '../query/struct-query';
import { valueToQueries, VisitorFn } from '../query/utils/value-to-query';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-explicit-any
export type QueryLoaderEvents<I, S extends Struct<any, any, any>> = {
  loaded: {
    key: QueryLoaderCacheKey<I, QueryDeep<InferRaw<S> | Infer<S>>>;
    value: ResultWithType<S>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResultWithType<S extends Struct<any, any, any>> =
  | {
      result: PartialQueryResultDeep<InferRaw<S>>;
      type: 'raw';
    }
  | {
      result: PartialQueryResultDeep<Infer<S>>;
      type: 'validated';
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AnyResultWithType<S extends Struct<any, any, any>> {
  result: PartialQueryResultDeep<InferRaw<S> | Infer<S>>;
  /**
   * @default 'validated'
   */
  type: 'raw' | 'validated';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueryLoaderParams<I, S extends Struct<any, any, any>, CG, CR> {
  batchLoadFn: (
    keys: readonly QueryLoaderKey<I, InferRaw<S>, CR>['cache'][],
    context: QueryLoaderContext<CG, CR>
  ) => MaybePromise<(PartialQueryResultDeep<InferRaw<S>> | Error)[]>;
  struct: S;
  loaderOptions?: Omit<
    DataLoader.Options<QueryLoaderKey<I, InferRaw<S>, CR>, CacheData<S>, string>,
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

export interface LoadOptions<R, T extends 'any' | 'raw' | 'validated' = 'any'> {
  context?: R;
  /**
   * Clears cached value before loading again. Cache is refreshed with newest value.
   * @default false;
   */
  clearCache?: boolean;
  /**
   * - any - Could be either 'raw' or 'validated'
   * - raw - Result is directly from batchLoadFn without modifications
   * - validation - Result is validated by struct and is guaranteed to match schema
   */
  resultType?: T;
}

export interface PrimeOptions<S> {
  /**
   * Clears cached value before priming. Ensures new value is inserted in the cache.
   * @default false;
   */
  clearCache?: boolean;
  queryVisitor?: VisitorFn<S>;
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
export interface CreateQueryFnOptions<R, S extends Struct<any, any, any>>
  extends Omit<LoadOptions<R>, 'resultType'> {
  mapQuery?: <V extends QueryDeep<InferRaw<S>>>(query: V) => Maybe<V>;
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

interface RawResult<Q> {
  /**
   * Raw unmodified result from batchLoadFn
   */
  raw: PartialQueryResultDeep<Q>;
}

interface ValidatedResult<Q> {
  /**
   * Result that has been coerced and validated
   */
  validated: PartialQueryResultDeep<Q>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheData<S extends Struct<any, any, any>> =
  | RawResult<InferRaw<S>>
  | ValidatedResult<Infer<S>>
  | (RawResult<InferRaw<S>> & ValidatedResult<Infer<S>>);

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
    QueryLoaderKey<I, InferRaw<S>, CR>,
    CacheData<S>,
    string
  >;

  private readonly loaderCacheMap: CacheMap<string, Promise<CacheData<S>>>;

  private readonly structQuery: StructQuery<S>;

  constructor(params: QueryLoaderParams<I, S, CG, CR>) {
    this.eventBus = params.eventBus;

    this.structQuery = StructQuery.get(params.struct);

    this.loaderCacheMap = params.loaderOptions?.cacheMap ?? new Map();

    this.loader = new DataLoader<
      QueryLoaderKey<I, InferRaw<S>, CR>,
      CacheData<S>,
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
                global: params.context as CG,
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
    const result = payload.value.result;
    if (this.emitLoadedIds.has(result)) return;
    try {
      this.emitLoadedIds.add(result);
      this.eventBus?.emit('loaded', payload);
    } finally {
      this.emitLoadedIds.delete(result);
    }
  }

  prime(
    key: PartialBy<QueryLoaderCacheKey<I, QueryDeep<InferRaw<S> | Infer<S>>>, 'query'>,
    value: AnyResultWithType<S>,
    options?: PrimeOptions<InferRaw<S> | Infer<S>>
  ) {
    const cacheIsStale = options?.clearCache ?? false;

    const queries = key.query
      ? [key.query]
      : valueToQueries(value.result, {
          visitorFn: options?.queryVisitor,
        });

    for (const query of queries) {
      splitQuery(query).forEach((leafQuery) => {
        const leafLoaderKey: QueryLoaderKey<I, InferRaw<S>, CR> = {
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

        if (value.type === 'raw') {
          this.loader.prime(leafLoaderKey, {
            raw: value.result,
          });
        } else {
          this.loader.prime(leafLoaderKey, {
            validated: value.result,
          });
        }

        if (!isAlreadyCached) {
          this.emitLoaded({
            key: leafLoaderKey.cache,
            value,
          });
        }
      });
    }
  }

  async load<
    V extends QueryDeep<InferRaw<S> & Infer<S>>,
    T extends 'any' | 'raw' | 'validated' = 'any',
  >(
    key: QueryLoaderCacheKey<I, V>,
    options?: LoadOptions<CR, T>
  ): Promise<
    T extends 'validated'
      ? QueryResultDeep<Infer<S>, V>
      : T extends 'raw'
        ? PartialQueryResultDeep<InferRaw<S>, V>
        : PartialQueryResultDeep<InferRaw<S> | Infer<S>, V>
  > {
    const cacheIsStale = options?.clearCache ?? false;

    const mapResultFn = this.getResultFn(options?.resultType ?? 'any');

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

        // console.log(leafLoaderKey);
        const leafValue = await this.loader.load(leafLoaderKey);

        const mappedValue = mapResultFn(leafLoaderKey, leafValue);

        return {
          leafKey: leafLoaderKey.cache,
          leafValue: mappedValue.result,
          type: mappedValue.type,
          isAlreadyCached,
        };
      })
    );

    const leafValues = splitResults.map((r) => r.leafValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedValue: any = mergedObjects(...leafValues);

    for (const { isAlreadyCached, leafKey, type } of splitResults) {
      if (isAlreadyCached) {
        continue;
      }

      this.emitLoaded({
        key: leafKey,
        value: {
          result: mergedValue,
          type,
        },
      });
    }

    return mergedValue;
  }

  createQueryFn(id: I, options?: CreateQueryFnOptions<CR, S>): MongoQueryFn<S> {
    return <
      V extends QueryDeep<InferRaw<S>>,
      T extends 'any' | 'raw' | 'validated' = 'any',
    >(
      query: V,
      resultType?: T
    ) => {
      query = options?.mapQuery?.(query) ?? query;

      return this.load(
        {
          id,
          query,
        },
        {
          ...options,
          resultType,
        }
      );
    };
  }

  private getValidatedResult(
    key: QueryLoaderKey<I, InferRaw<S>, CR>,
    data: CacheData<S>
  ) {
    if ('validated' in data) {
      return { result: data.validated, type: 'validated' as const };
    }

    const validatedResult = this.structQuery.rawValueToValidated(
      data.raw,
      key.cache.query
    );

    const newData: RawResult<InferRaw<S>> & ValidatedResult<Infer<S>> = {
      raw: data.raw,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validated: validatedResult as any,
    };

    this.loader.clear(key).prime(key, newData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { result: newData.validated as any, type: 'validated' as const };
  }

  private getRawResult(key: QueryLoaderKey<I, InferRaw<S>, CR>, data: CacheData<S>) {
    if ('raw' in data) {
      return { result: data.raw, type: 'raw' as const };
    }

    const rawValidatedResult = this.structQuery.validatedValueToRaw(
      data.validated,
      key.cache.query
    );

    const newData: RawResult<InferRaw<S>> & ValidatedResult<Infer<S>> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw: rawValidatedResult as any,
      validated: data.validated,
    };

    this.loader.clear(key).prime(key, newData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { result: newData.raw as any, type: 'raw' as const };
  }

  private getAnyResult(_key: QueryLoaderKey<I, InferRaw<S>, CR>, data: CacheData<S>) {
    if ('raw' in data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { result: data.raw as any, type: 'raw' as const };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { result: data.validated as any, type: 'validated' as const };
  }

  private getResultFn(type: 'raw' | 'validated' | 'any') {
    switch (type) {
      case 'raw':
        return this.getRawResult.bind(this);
      case 'validated':
        return this.getValidatedResult.bind(this);
      default:
        return this.getAnyResult.bind(this);
    }
  }

  private isKeyCached<Q>(cacheKey: QueryLoaderCacheKey<I, Q>) {
    return this.loaderCacheMap.get(memoizedGetEqualObjectString(cacheKey)) != null;
  }
}
