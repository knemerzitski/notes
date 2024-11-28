/* eslint-disable @typescript-eslint/no-explicit-any */

import { isObjectLike } from '~utils/type-guards/is-object-like';

/**
 * [key,value]
 */
type Entry = [any, any];

/**
 * Pick object is a nested object that allows only `1` as primitive value which
 * picks that property.
 * @returns New object that is merged according to pick objects.
 */
export function mergeObjectsByKeyPath<T>(entries: Entry[], ctx?: { target: any }): T {
  const target = ctx?.target ?? (Array.isArray(entries[0]?.[1]) ? [] : {});

  for (const [pickObj, valueObj] of entries) {
    if (!isObjectLike(pickObj)) {
      throw new Error(`Merge by path invalid key "${String(pickObj)}"`);
    }
    if (!isObjectLike(valueObj)) {
      continue;
    }

    if (Array.isArray(valueObj)) {
      for (let i = 0; i < valueObj.length; i++) {
        target[i] = target[i] ?? (Array.isArray(valueObj[i]) ? [] : {});
        mergeObjectsByKeyPath([[pickObj, valueObj[i]]], {
          target: target[i],
        });
      }
    } else {
      for (const [pickKey, pickValue] of Object.entries(pickObj)) {
        if (!(pickKey in valueObj)) {
          continue;
        }
        if (pickValue === 1) {
          target[pickKey] = valueObj[pickKey];
        } else if (isObjectLike(pickValue)) {
          if (!isObjectLike(valueObj[pickKey])) {
            continue;
          }

          target[pickKey] =
            target[pickKey] ?? (Array.isArray(valueObj[pickKey]) ? [] : {});
          mergeObjectsByKeyPath([[pickValue, valueObj[pickKey]]], {
            target: target[pickKey],
          });
        } else {
          throw new Error(`Merge by path unknown path object "${String(pickValue)}"`);
        }
      }
    }
  }

  return target;
}
