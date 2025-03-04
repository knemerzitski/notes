import { MaybePromise, Maybe } from '@graphql-tools/utils';

import { PickValue, PickStartsWith, PartialDeep } from '../../../../utils/src/types';

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

type OmitUndefinedNever<T> = {
  [Key in keyof T as T[Key] extends undefined
    ? never
    : T[Key] extends never
      ? never
      : Key]: T[Key];
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
        ? OmitUndefinedNever<{
            [Key in keyof T]: Key extends `${QueryArgPrefix}${string}`
              ? never
              : Key extends keyof V
                ? V[Key] extends PickValue
                  ? T[Key]
                  : Exclude<T[Key], undefined> extends object
                    ? V[Key] extends QueryDeep<T[Key], P>
                      ? QueryResultDeep<T[Key], V[Key], P>
                      : T[Key] extends P
                        ? T[Key]
                        : never
                    : never
                : never;
          }>
        : never
>;

export type PartialQueryResultDeep<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends QueryDeep<T, P> = any,
  P = MongoPrimitive,
> = PartialDeep<QueryResultDeep<T, V, P>, P>;

export type MongoQueryFn<S> = <V extends QueryDeep<S>>(
  query: V
) => MaybePromise<Maybe<QueryResultDeep<S, V>>>;

export function createMapQueryFn<From>(fromQuery: MongoQueryFn<From>) {
  return <To>() =>
    <const PickFrom extends QueryDeep<From>, const PickTo extends QueryDeep<To>>(
      mapQuery: (query: PickTo) => PickFrom,
      mapResult: (
        result: QueryResultDeep<From, PickFrom>
      ) => MaybePromise<Maybe<QueryResultDeep<To, PickTo>>>
    ): MongoQueryFn<To> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (query): Promise<any> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const result = await fromQuery(mapQuery(query as any));
      if (result == null) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      return mapResult(result as any);
    };
}

export function createValueQueryFn<S>(
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getValue: <V extends QueryDeep<S>>(
    query: V
  ) => MaybePromise<Maybe<PartialQueryResultDeep<S>>>,
  options?: {
    mapQuery?: <V extends QueryDeep<S>>(query: V) => V;
  }
): MongoQueryFn<S> {
  return (query) => {
    query = options?.mapQuery?.(query) ?? query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return getValue(query) as any;
  };
}

export function createPartialValueQueryFn<S>(
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getValue: <V extends QueryDeep<S>>(
    query: V
  ) => MaybePromise<Maybe<PartialQueryResultDeep<S>>>
): MongoQueryFn<S> {
  return (query) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return getValue(query) as any;
  };
}
