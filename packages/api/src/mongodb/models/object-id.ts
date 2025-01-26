import { ObjectId } from 'mongodb';
import { coerce, instance, string } from 'superstruct';

import { strToObjectId, objectIdToStr } from '../utils/objectid';

export const ObjectIdStrStruct = coerce(
  instance(ObjectId),
  string(),
  strToObjectId,
  objectIdToStr
);
