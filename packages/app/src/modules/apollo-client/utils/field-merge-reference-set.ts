import { FieldMergeFunction, StoreObject, Reference } from '@apollo/client';

export const fieldMergeReferenceSet: FieldMergeFunction<
  (StoreObject | Reference)[],
  (StoreObject | Reference)[]
> = function (existing = [], incoming, { toReference, mergeObjects }) {
  const combinedMap = [...existing, ...incoming].reduce<
    Record<string, StoreObject | Reference>
  >((map, value) => {
    const ref = toReference(value)?.__ref;
    if (ref) {
      const duplicateValue = map[ref];
      if (duplicateValue) {
        map[ref] = mergeObjects(value, duplicateValue);
      } else {
        map[ref] = value;
      }
    }
    return map;
  }, {});

  return Object.values(combinedMap);
};
