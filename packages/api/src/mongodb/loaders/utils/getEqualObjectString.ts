import { ObjectId } from 'mongodb';

import sortObject from '~utils/object/sortObject';

export default function getEqualObjectString(obj: unknown) {
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
