/**
 * Utility functions to help defined changeset class instances from plain primitive.
 */

import Changeset from '../../Changeset';
import IndexStrip from '../../IndexStrip';
import RangeStrip from '../../RangeStrip';
import StringStrip from '../../StringStrip';
import { EMPTY } from '../../Strip';
import Strips from '../../Strips';

/**
 * Create changeset class instances from primitives.
 * string => StringStrip.
 * number => IndexStrip.
 * [number,number] => RangeStrip.
 * null | undefined => EMPTY (Strip).
 */
export function toStrip(value: unknown) {
  if (typeof value === 'string') {
    return new StringStrip(value);
  } else if (typeof value === 'number') {
    return new IndexStrip(value);
  } else if (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return new RangeStrip(value[0], value[1]);
  } else if (value == null) {
    return EMPTY;
  }

  throw new Error(`Unable to convert to Strip: ${String(value)}`);
}

// Strips
/**
 * Create strips from primitives.
 * string => StringStrip.
 * number => IndexStrip.
 * [number,number] => RangeStrip.
 */
export function toStrips(arr: unknown[]): Strips {
  return new Strips(arr.map((value) => toStrip(value)));
}

export function toChangeset(value: unknown) {
  if (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Array.isArray(value[2])
  ) {
    return new Changeset({
      requiredLength: value[0],
      length: value[1],
      strips: toStrips(value[2]),
    });
  }

  throw new Error(`Unable to convert to Changeset: ${String(value)}`);
}
