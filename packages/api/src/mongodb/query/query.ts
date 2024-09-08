import { Infer, InferRaw, Struct } from 'superstruct';

import {
  Maybe,
  MaybePromise,
  PartialDeep,
  PickStartsWith,
  PickValue,
  OmitNever,
  OmitUndefined,
} from '~utils/types';

import { MongoPrimitive } from '../types';

export const QUERY_ARG_PREFIX = '$';
export type QueryArgPrefix = typeof QUERY_ARG_PREFIX;

export type QueryDeep<T, P = MongoPrimitive> = T extends P
  ? PickValue
  : T extends (infer U)[]
    ? QueryDeep<U, P> & PickStartsWith<T, QueryArgPrefix>
    : T extends object
      ? QueryObjectDeep<T, P>
      : never;

export type QueryObjectDeep<T extends object, P = MongoPrimitive> = {
  [Key in keyof T]?: Key extends `${QueryArgPrefix}${string}`
    ? T[Key]
    : T[Key] extends P
      ? PickValue
      : QueryDeep<T[Key], P>;
};

export type QueryResultDeep<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends QueryDeep<T, P> = any,
  P = MongoPrimitive,
> = Readonly<
  T extends P
    ? T
    : T extends (infer U)[]
      ? V extends QueryDeep<U, P>
        ? QueryResultDeep<U, V, P>[]
        : never
      : T extends object
        ? OmitNever<
            OmitUndefined<{
              [Key in keyof T]: Key extends `${QueryArgPrefix}${string}`
                ? never
                : Key extends keyof V
                  ? V[Key] extends PickValue
                    ? T[Key]
                    : Exclude<T[Key], undefined> extends object
                      ? V[Key] extends QueryDeep<T[Key], P>
                        ? QueryResultDeep<T[Key], V[Key], P>
                        : never
                      : never
                  : never;
            }>
          >
        : never
>;

export type PartialQueryResultDeep<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends QueryDeep<T, P> = any,
  P = MongoPrimitive,
> = PartialDeep<QueryResultDeep<T, V, P>, P>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MongoQueryFn<S extends Struct<any, any, any>> = <
  V extends QueryDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
>(
  query: V,
  resultType?: T
) => MaybePromise<Maybe<MongoQueryResult<S, V, T>>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrictMongoQueryFn<S extends Struct<any, any, any>> = <
  V extends QueryDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
>(
  query: V,
  resultType?: T
) => MaybePromise<MongoQueryResult<S, V, T>>;

type MongoQueryResult<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends Struct<any, any, any>,
  V extends QueryDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
> = T extends 'validated'
  ? QueryResultDeep<Infer<S>, V>
  : T extends 'raw'
    ? PartialQueryResultDeep<InferRaw<S>, V>
    : PartialQueryResultDeep<InferRaw<S> | Infer<S>, V>;

export type MongoQueryFnStruct<T> = T extends MongoQueryFn<infer R> ? R : never;

export function createMapQueryFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  From extends Struct<any, any, any>,
>(fromQuery: MongoQueryFn<From>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <To extends Struct<any, any, any>>() =>
    <
      const PickFrom extends QueryDeep<InferRaw<From> | Infer<From>>,
      const PickTo extends QueryDeep<InferRaw<To> | Infer<To>>,
    >(
      mapQuery: (query: PickTo) => PickFrom,
      mapResult: (
        result: PartialQueryResultDeep<InferRaw<From> & Infer<From>, PickFrom>
      ) => Maybe<PartialQueryResultDeep<InferRaw<To> & Infer<To>, PickTo>>
    ): MongoQueryFn<To> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (query, type): Promise<any> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await fromQuery(mapQuery(query as any), type);
      if (result == null) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mapResult(result as any);
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PartialMongoQueryFn<S extends Struct<any, any, any>> = <
  V extends QueryDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
>(
  query: V,
  resultType?: T
) => MaybePromise<Maybe<PartialQueryResultDeep<InferRaw<S> | Infer<S>, V>>>;

export function wrapOnlyRawQueryFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends Struct<any, any, any>,
>(partialQuery: PartialMongoQueryFn<S>): MongoQueryFn<S> {
  return (query, resultType) => {
    switch (resultType) {
      case 'validated':
        throw new Error('Cannot return validated result from a partial query');
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return partialQuery(query, resultType) as any;
    }
  };
}

export function wrapOnlyValidatedQueryFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends Struct<any, any, any>,
>(partialQuery: PartialMongoQueryFn<S>): MongoQueryFn<S> {
  return (query, resultType) => {
    switch (resultType) {
      case 'raw':
        throw new Error('Cannot return raw result from a partial query');
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return partialQuery(query, resultType) as any;
    }
  };
}
