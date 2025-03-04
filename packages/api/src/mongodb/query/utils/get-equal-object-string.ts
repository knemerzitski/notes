import { ObjectId } from 'mongodb';

import { memoize1 } from '../../../../../utils/src/memoize1';
import { sortObject } from '../../../../../utils/src/object/sort-object';

export const memoizedGetEqualObjectString = memoize1(getEqualObjectString);

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
