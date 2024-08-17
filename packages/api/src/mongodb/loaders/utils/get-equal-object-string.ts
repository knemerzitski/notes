import { ObjectId } from 'mongodb';

import { sortObject } from '~utils/object/sort-object';

export function getEqualObjectString(obj: unknown) {
  return JSON.stringify(
    sortObject(obj, {
      sort: sortEverythingExceptObjectIdAndDate,
      exclude: excludeIsUndefined,
    }),
    null,
    undefined
  );
}

function sortEverythingExceptObjectIdAndDate(value: object) {
  const excludeClasses = [ObjectId, Date];
  return !excludeClasses.some((KlassConstructor) => value instanceof KlassConstructor);
}

function excludeIsUndefined({ value }: { value: unknown }) {
  return value === undefined;
}
