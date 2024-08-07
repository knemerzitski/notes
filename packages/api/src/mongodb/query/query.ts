import { ObjectId } from 'mongodb';

import { Maybe, MaybePromise } from '~utils/types';

import { RelayPagination } from '../pagination/relayArrayPagination';

export type Primitive = string | number | boolean | ObjectId | Date;
export type ProjectionValue = 1 | undefined;
export type IdProjectionValue = 0 | ProjectionValue;

export type Cursor = string | number | ObjectId;

/**
 * Type that maps every property to:
 * Primitives: 1 or undefined (for $project)
 * Arrays: Relay pagination
 */
export type DeepQuery<T> = T extends (infer U)[]
  ? DeepArrayQuery<U>
  : T extends Primitive
    ? ProjectionValue
    : T extends object
      ? DeepObjectQuery<T>
      : T;

export type DeepObjectQuery<T extends object> = {
  [Key in keyof T]?: T[Key] extends Primitive
    ? Key extends '_id'
      ? IdProjectionValue
      : ProjectionValue
    : DeepQuery<T[Key]>;
};

export interface DeepArrayQuery<TItem> {
  $query?: DeepQuery<TItem>;
  $pagination?: RelayPagination<Cursor>;
}

export function isArrayQuery(value?: unknown): value is DeepArrayQuery<unknown> {
  const isObject = value != null && typeof value == 'object';
  if (!isObject) return false;

  const hasQuery =
    '$query' in value && value.$query != null && typeof value.$query === 'object';
  return hasQuery;
}

/**
 * Makes every property optional except Primitives
 * e.g. ObjectId is unmodified
 */
export type DeepQueryResult<T> = T extends (infer U)[]
  ? DeepQueryResult<Readonly<U>>[]
  : T extends Primitive
    ? T
    : T extends object
      ? DeepObjectQueryResult<T>
      : T;

export type DeepObjectQueryResult<T extends object> = Readonly<{
  [Key in keyof T]?: DeepQueryResult<T[Key]>;
}>;

export interface MongoQuery<TDocument> {
  query(query: DeepQuery<TDocument>): MaybePromise<Maybe<DeepQueryResult<TDocument>>>;
}
