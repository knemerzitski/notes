import { ObjectId } from 'mongodb';

import { isObjectLike } from '../../../../../utils/src/type-guards/is-object-like';

import { Changeset, Selection } from '../../../../../collab/src';

import { MongoPrimitive } from '../../types';

export function isMongoPrimitive(value: unknown): value is MongoPrimitive {
  if (isObjectLike(value)) {
    return (
      value instanceof ObjectId ||
      value instanceof Date ||
      value instanceof Changeset ||
      value instanceof Selection
    );
  }

  return true;
}
