import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset/changeset';

import { PartialDeep, Primitive } from '~utils/types';

/**
 * This interface conforms to $arrayToObject \
 * $arrayToObject requires array element to have to fields "k" and "v"
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
 */
export interface Entry<Key, Value> {
  k: Key;
  v: Value;
}

type ExtraPrimitives = ObjectId | Date | Changeset;

export type MongoPrimitive = Exclude<Primitive, undefined> | ExtraPrimitives;

export type MongoPartialDeep<T> = PartialDeep<T, ExtraPrimitives>;