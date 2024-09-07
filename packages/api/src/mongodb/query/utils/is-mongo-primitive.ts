import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset/changeset';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { MongoPrimitive } from '../../types';

export function isMongoPrimitive(value: unknown): value is MongoPrimitive {
  if (isObjectLike(value)) {
    return (
      value instanceof ObjectId || value instanceof Date || value instanceof Changeset
    );
  }

  return true;
}
