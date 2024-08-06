import { ObjectId } from 'mongodb';

import { DeepPartial, Primitive } from '~utils/types';

/**
 * This interface conforms to $arrayToObject \
 * $arrayToObject requires array element to have to fields "k" and "v"
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
 */
export interface Entry<Key, Value> {
  k: Key;
  v: Value;
}

export type MongoPrimitive = Primitive | ObjectId;

export type MongoDeepPartial<T> = DeepPartial<T, ObjectId>;
