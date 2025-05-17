import { ObjectId } from 'mongodb';

import { Primitive, PartialDeep, ReadonlyDeep } from '../../../utils/src/types';

import { Changeset, Selection } from '../../../collab2/src';

/**
 * This interface conforms to $arrayToObject \
 * $arrayToObject requires array element to have to fields "k" and "v"
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
 */
export interface Entry<Key, Value> {
  k: Key;
  v: Value;
}

type ExtraPrimitives = ObjectId | Date | Changeset | Selection;

export type MongoPrimitive = Exclude<Primitive, undefined> | ExtraPrimitives;

export type MongoPartialDeep<T> = PartialDeep<T, ExtraPrimitives>;

export type MongoReadonlyDeep<T> = ReadonlyDeep<T, MongoPrimitive>;
