import { ObjectId } from 'mongodb';
import { coerce, define, instance, object, optional, union, unknown } from 'superstruct';

import { ObjectIdStrStruct } from '../../mongodb/models/object-id';

const OptionalStruct = define<undefined>(
  'Undefined',
  (value) => typeof value === 'undefined'
);

const CurrentUserModelStruct = object({
  userId: union([OptionalStruct, optional(ObjectIdStrStruct)]),
});

export class CurrentUserModel {
  constructor(public userId?: ObjectId | undefined) {}
}

export const CurrentUserModelInstanceStruct = coerce(
  instance(CurrentUserModel),
  unknown(),
  (value) => {
    const parsedValue = CurrentUserModelStruct.mask(value);
    return new CurrentUserModel(parsedValue.userId);
  },
  (value) => CurrentUserModelStruct.maskRaw(value)
);
