/* eslint-disable @typescript-eslint/no-explicit-any */

import { isObjectLike } from '../../../../../utils/src/type-guards/is-object-like';

/**
 * [key,value]
 */
type Entry = [any, any];

/**
 * Pick object is a nested object that allows only `1` as primitive value which
 * picks that property.
 * @returns New object that is merged according to pick objects.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function mergeObjectsByKeyPath<T>(entries: Entry[], ctx?: { target: any }): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const target = ctx?.target ?? (Array.isArray(entries[0]?.[1]) ? [] : {});

  for (const [pickObj, valueObj] of entries) {
    if (!isObjectLike(pickObj) || !isObjectLike(valueObj)) {
      continue;
    }

    if (Array.isArray(valueObj)) {
      for (let i = 0; i < valueObj.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        target[i] = target[i] ?? (Array.isArray(valueObj[i]) ? [] : {});
        mergeObjectsByKeyPath([[pickObj, valueObj[i]]], {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          target: target[i],
        });
      }
    } else {
      for (const [pickKey, pickValue] of Object.entries(pickObj)) {
        if (!(pickKey in valueObj)) {
          continue;
        }
        if (pickValue === 1) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          target[pickKey] = valueObj[pickKey];
        } else if (isObjectLike(pickValue)) {
          if (!isObjectLike(valueObj[pickKey])) {
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          target[pickKey] =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            target[pickKey] ?? (Array.isArray(valueObj[pickKey]) ? [] : {});
          mergeObjectsByKeyPath([[pickValue, valueObj[pickKey]]], {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            target: target[pickKey],
          });
        } else {
          throw new Error(`Merge by path unknown path object "${String(pickValue)}"`);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return target;
}
