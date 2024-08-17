import { Maybe, MaybePromise, OmitStartsWith, PickStartsWith } from '~utils/types';

import { MongoPrimitive } from '../types';

export const QUERY_ARG_PREFIX = '$';
export type QueryArgPrefix = typeof QUERY_ARG_PREFIX;

/**
 * Maps primitives to 1 (for $project stage).
 * Properties starting with $ sign are passed along as arguments.
 */
export type DeepQuery<T> = T extends (infer U)[]
  ? DeepQuery<U> & PickStartsWith<T, QueryArgPrefix>
  : T extends MongoPrimitive
    ? FieldInclusion
    : T extends object
      ? DeepObjectQuery<T>
      : T;

export type DeepObjectQuery<T extends object> = {
  [Key in keyof T]?: Key extends `${QueryArgPrefix}${string}`
    ? T[Key]
    : T[Key] extends MongoPrimitive
      ? FieldInclusion
      : DeepQuery<T[Key]>;
};

export type FieldInclusion = 1;

/**
 * Makes every property optional except Primitives
 * e.g. ObjectId is unmodified
 */
export type DeepQueryResult<T> = T extends (infer U)[]
  ? DeepQueryResult<Readonly<U>>[]
  : T extends MongoPrimitive
    ? T
    : T extends object
      ? DeepObjectQueryResult<T>
      : T;

export type DeepObjectQueryResult<T extends object> = Readonly<
  OmitStartsWith<
    {
      [Key in keyof T]?: DeepQueryResult<T[Key]>;
    },
    QueryArgPrefix
  >
>;

export interface MongoQuery<TDocument> {
  query: MongoQueryFn<TDocument>;
}

export type MongoQueryFn<TDocument> = (
  query: DeepQuery<TDocument>
) => MaybePromise<Maybe<DeepQueryResult<TDocument>>>;
