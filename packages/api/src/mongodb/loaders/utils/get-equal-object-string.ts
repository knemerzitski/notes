import { ObjectId } from 'mongodb';

import { sortObject } from '~utils/object/sort-object';

export function getEqualObjectString(obj: unknown) {
  return JSON.stringify(
    sortObject(obj, {
      sort: sortEverythingExceptObjectId,
      exclude: excludeIsUndefined,
    }),
    null,
    undefined
  );
}

function sortEverythingExceptObjectId(value: object) {
  return !(value instanceof ObjectId);
}

function excludeIsUndefined({ value }: { value: unknown }) {
  return value === undefined;
}
