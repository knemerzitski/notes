import { Changeset } from './changeset';
import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Single function to create a strip.
 * Will never throw an error but instead modifies provided
 * values as needed to fit strip constraints.
 */
export function createStrip(): Strip;
export function createStrip(insertValue: string): InsertStrip | Strip;
export function createStrip(
  retainStartIndex: number,
  retainEndIndexExclusive?: number
): RetainStrip | Strip;
export function createStrip(
  stripArg?: null | string | number | number[]
): RetainStrip | Strip;
export function createStrip(
  arg1?: null | string | number | number[],
  arg2?: number
): Strip {
  if (Array.isArray(arg1) && typeof arg1[0] === 'number') {
    return RetainStrip.create(arg1[0], typeof arg1[1] === 'number' ? arg1[1] : arg1[0]);
  } else if (typeof arg1 === 'number') {
    return RetainStrip.create(arg1, typeof arg2 == 'number' ? arg2 : arg1);
  } else if (typeof arg1 === 'string') {
    return InsertStrip.create(arg1);
  }
  return Strip.EMPTY;
}

export function createStrips(values: (string | number | number[])[] = []): Strips {
  if (values.length === 0) return Strips.EMPTY;
  return new Strips(values.map((value) => createStrip(value)));
}

export function createChangeset(values: (string | number | number[])[] = []): Changeset {
  if (values.length === 0) return Changeset.EMPTY;
  return new Changeset(createStrips(values));
}
