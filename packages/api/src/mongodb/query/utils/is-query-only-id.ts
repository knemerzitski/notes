import { MongoPrimitive } from '../../types';
import { QueryDeep } from '../query';

export function isQueryOnlyId(query: QueryDeep<{ _id: MongoPrimitive }>) {
  return query._id === 1 && Object.keys(query).length === 1;
}
