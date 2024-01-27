/**
 * Utility functions to help defined changeset class instances from plain primitive.
 */

import { Changeset } from '../../changeset';
import { InsertStrip } from '../../insert-strip';
import { RetainStrip } from '../../retain-strip';
import { EMPTY } from '../../strip';
import { Strips } from '../../strips';

/**
 * Create changeset class instances from primitives.
 * string => StringStrip.
 * number => IndexStrip.
 * [number,number] => RangeStrip.
 * null | undefined => EMPTY (Strip).
 */
export function toStrip(value: unknown) {
  if (typeof value === 'string') {
    return new InsertStrip(value);
  } else if (typeof value === 'number') {
    return new RetainStrip(value, value);
  } else if (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return new RetainStrip(value[0], value[1]);
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

export function toChangeset(value: unknown[]) {
  return new Changeset(toStrips(value));
}
