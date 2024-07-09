/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mapObject, { mapObjectSkip } from 'map-obj';

/**
 * @returns Permutations of object by selecting possibility of each value in array.
 *
 * E.g.
 * ```
 * for(const value of objectPermutations({a:[1,2],b:[3,4]})){
 *  console.log(value)
 * }
 * // {a: 2, b: 4}
 * // {a: 2, b: 3}
 * // {a: 1, b: 4}
 * // {a: 1, b: 3}
 * ```
 */
export default function* objectValueArrayPermutations(
  obj?: Record<string, unknown[]>
): Generator<Readonly<Record<string, unknown>>> {
  if (!obj) return;

  const length = Object.keys(obj).length;
  if (length === 0) return;

  const keyToMaxIndex = mapObject(obj, (key, values) => {
    if (values.length === 0) {
      return mapObjectSkip;
    }
    return [key, values.length - 1];
  });
  const keys = Object.keys(keyToMaxIndex);
  if (keys.length === 0) return;

  const value = mapObject<Record<string, unknown[]>, string, unknown>(
    obj,
    (key, values) => {
      const lastValue = values[values.length - 1];
      if (lastValue == null) {
        return mapObjectSkip;
      }
      return [key, lastValue];
    }
  );

  yield value;

  const indexes = { ...keyToMaxIndex };
  let k = keys.length - 1;
  while (k >= 0) {
    const key = keys[k]!;
    let i = --indexes[key]!;
    if (i >= 0) {
      value[key] = obj[key]![i];
      yield value;
      k = keys.length - 1;
    } else {
      i = keyToMaxIndex[key]!;
      indexes[key] = i;
      value[key] = obj[key]![i];
      k--;
    }
  }
}
