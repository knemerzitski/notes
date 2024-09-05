import { Infer, InferRaw, Struct } from 'superstruct';

import {
  Maybe,
  MaybePromise,
  PartialDeep,
  PickDeep,
  PickerDeep,
  PickStartsWith,
  PickValue,
  ReadonlyDeep,
} from '~utils/types';

import { MongoPickerDeep, MongoPrimitive } from '../types';

export const QUERY_ARG_PREFIX = '$';
export type QueryArgPrefix = typeof QUERY_ARG_PREFIX;

export type QueryDeep<T, P = MongoPrimitive> = T extends P
  ? PickValue
  : T extends (infer U)[]
    ? QueryDeep<U, P> & PickStartsWith<T, QueryArgPrefix>
    : T extends object
      ? QueryObjectDeep<T, P>
      : T;

export type QueryObjectDeep<T extends object, P = MongoPrimitive> = {
  [Key in keyof T]?: Key extends `${QueryArgPrefix}${string}`
    ? T[Key]
    : T[Key] extends MongoPrimitive
      ? PickValue
      : QueryDeep<T[Key], P>;
};

export type QueryResultDeep<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends PickerDeep<T, P> = any,
  P = MongoPrimitive,
> = ReadonlyDeep<PickDeep<T, V, P>, P>;

export type PartialQueryResultDeep<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends PickerDeep<T, P> = any,
  P = MongoPrimitive,
> = PartialDeep<QueryResultDeep<T, V, P>, P>;

export type QueryPickerDeep<R, P = MongoPrimitive> = QueryDeep<R, P> &
  MongoPickerDeep<R, P>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MongoQueryFn<S extends Struct<any, any, any>> = <
  V extends QueryPickerDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
>(
  query: V,
  resultType?: T
) => MaybePromise<
  Maybe<
    T extends 'any'
      ? PartialQueryResultDeep<InferRaw<S> | Infer<S>, V>
      : T extends 'raw'
        ? PartialQueryResultDeep<InferRaw<S>, V>
        : QueryResultDeep<Infer<S>, V>
  >
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PartialMongoQueryFn<S extends Struct<any, any, any>> = <
  V extends QueryPickerDeep<InferRaw<S> & Infer<S>>,
  T extends 'any' | 'raw' | 'validated' = 'any',
>(
  query: V,
  resultType?: T
) => MaybePromise<Maybe<PartialQueryResultDeep<InferRaw<S> | Infer<S>, V>>>;

interface QueryHelpers<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends Struct<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends Struct<any, any, any>,
> {
  /**
   * Redirects one query into other and maps result to match redirection.
   */
  redirect: RedirectQueryFn<A, B>;
}

type RedirectQueryFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends Struct<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends Struct<any, any, any>,
> = <
  PA extends QueryPickerDeep<InferRaw<A> | Infer<A>>,
  PB extends QueryPickerDeep<InferRaw<B> | Infer<B>>,
>(
  sourceQueryFn: MongoQueryFn<A>,
  redirectFn: (query: PB) => PA,
  extractFn: (
    result: PartialQueryResultDeep<InferRaw<A> & Infer<A>, PA>
  ) => Maybe<PartialQueryResultDeep<InferRaw<B> & Infer<B>, PB>> // mause take from here?
) => MongoQueryFn<B>;

type UnwrapMongoQueryFn<T> =
  T extends MongoQueryFn<infer R>
    ? R
    : T extends { query: MongoQueryFn<infer R> }
      ? R
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        T extends (...args: any) => infer R
        ? UnwrapMongoQueryFn<R>
        : T extends Promise<infer R>
          ? UnwrapMongoQueryFn<R>
          : T extends null | undefined
            ? UnwrapMongoQueryFn<NonNullable<T>>
            : never;

export function wrapQueryHelpers<
  TArgs extends unknown[],
  TReturn,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends Struct<any, any, any> = UnwrapMongoQueryFn<TArgs[0]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends Struct<any, any, any> = UnwrapMongoQueryFn<TReturn>,
>(
  fn: (helper: QueryHelpers<A, B>, ...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const queryHelpers: QueryHelpers<A, B> = {
    redirect: <
      const PA extends QueryPickerDeep<InferRaw<A> | Infer<A>>,
      const PB extends QueryPickerDeep<InferRaw<B> | Infer<B>>,
    >(
      sourceQuery: MongoQueryFn<A>,
      mapQuery: (query: PB) => PA,
      extractResult: (
        result: PartialQueryResultDeep<InferRaw<A> & Infer<A>, PA>
      ) => Maybe<PartialQueryResultDeep<InferRaw<B> & Infer<B>, PB>> // mause take from here?
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async function targetQueryFn(query: any, type: any) {
        const result = await sourceQuery(mapQuery(query), type);
        if (result == null) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extractResult(result as any);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return targetQueryFn as any;
    },
  };

  return (...args) => {
    return fn(queryHelpers, ...args);
  };
}

export function wrapPartialQuery<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends Struct<any, any, any>,
>(partialQuery: PartialMongoQueryFn<S>): MongoQueryFn<S> {
  return (query, resultType) => {
    switch (resultType) {
      case 'validated':
        throw new Error('Cannot return validated result from a partial query');
      default:
        return partialQuery(query, resultType);
    }
  };
}
