import { ObjectId } from 'mongodb';

import { PartialDeep, PickerDeep, Primitive } from '~utils/types';

/**
 * This interface conforms to $arrayToObject \
 * $arrayToObject requires array element to have to fields "k" and "v"
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
 */
export interface Entry<Key, Value> {
  k: Key;
  v: Value;
}

type ExtraPrimitives = ObjectId | Date;

export type MongoPrimitive = Exclude<Primitive, undefined> | ExtraPrimitives;

export type MongoPartialDeep<T> = PartialDeep<T, ExtraPrimitives>;

export type MongoPickerDeep<T, P = MongoPrimitive> = PickerDeep<T, P>;
