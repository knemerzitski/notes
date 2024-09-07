import { isObjectLike } from '~utils/type-guards/is-object-like';
import { QueryDeep } from '../query';
import { ObjectId } from 'mongodb';

export function isQueryOnlyId(query: QueryDeep<{ _id: ObjectId }>) {
  return isObjectLike(query) && query._id === 1 && Object.keys(query).length === 1;
}
