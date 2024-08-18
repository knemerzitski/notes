import { Maybe, MaybePromise, OmitStartsWith, PickStartsWith } from '~utils/types';

import { MongoPrimitive } from '../types';

export const QUERY_ARG_PREFIX = '$';
export type QueryArgPrefix = typeof QUERY_ARG_PREFIX;

/**
 * Maps primitives to 1 (for $project stage).
 * Properties starting with $ sign are passed along as arguments.
 */
export type QueryDeep<T> = T extends (infer U)[]
  ? QueryDeep<U> & PickStartsWith<T, QueryArgPrefix>
  : T extends MongoPrimitive
    ? FieldInclusion
    : T extends object
      ? ObjectQueryDeep<T>
      : T;

export type ObjectQueryDeep<T extends object> = {
  [Key in keyof T]?: Key extends `${QueryArgPrefix}${string}`
    ? T[Key]
    : T[Key] extends MongoPrimitive
      ? FieldInclusion
      : QueryDeep<T[Key]>;
};

export type FieldInclusion = 1;

/**
 * Makes every property optional except Primitives
 * e.g. ObjectId is unmodified
 */
export type QueryResultDeep<T> = T extends (infer U)[]
  ? QueryResultDeep<Readonly<U>>[]
  : T extends MongoPrimitive
    ? T
    : T extends object
      ? ObjectQueryResultDeep<T>
      : T;

export type ObjectQueryResultDeep<T extends object> = Readonly<
  OmitStartsWith<
    {
      [Key in keyof T]?: QueryResultDeep<T[Key]>;
    },
    QueryArgPrefix
  >
>;

export type MongoQueryFn<TDocument> = (
  query: QueryDeep<TDocument>
) => MaybePromise<Maybe<QueryResultDeep<TDocument>>>;
