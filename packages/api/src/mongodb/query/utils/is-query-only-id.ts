import { isObjectLike } from '~utils/type-guards/is-object-like';
import { QueryDeep } from '../query';

export function isQueryOnlyId(query: QueryDeep<unknown>) {
  return isObjectLike(query) && query._id === 1 && Object.keys(query).length === 1;
}
