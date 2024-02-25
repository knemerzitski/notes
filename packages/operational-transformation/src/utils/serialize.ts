import { Changeset } from '../changeset';
import { InsertStrip } from '../insert-strip';
import { RetainStrip } from '../retain-strip';
import { RevisionChangeset } from '../revision-changeset';
import { Strip } from '../strip';
import { Strips } from '../strips';

export type SerializedStrip = string | number | number[] | null;
export type SerializedStrips = SerializedStrip[] | null;
export type SerializedChangeset = SerializedStrips;
export interface SerializedRevisionChangeset {
  revision: number;
  changeset: SerializedChangeset;
}

/**
 * Single function to create a strip.
 * Will never throw an error but instead modifies provided
 * values as needed to fit strip constraints.
 */
export function deserializeStrip(): Strip;
export function deserializeStrip(insertValue: string): InsertStrip | Strip;
export function deserializeStrip(
  retainStartIndex: number,
  retainEndIndexExclusive?: number
): RetainStrip | Strip;
export function deserializeStrip(stripArg?: SerializedStrip): RetainStrip | Strip;
export function deserializeStrip(arg1?: SerializedStrip, arg2?: number): Strip {
  if (Array.isArray(arg1) && typeof arg1[0] === 'number') {
    return RetainStrip.create(arg1[0], typeof arg1[1] === 'number' ? arg1[1] : arg1[0]);
  } else if (typeof arg1 === 'number') {
    return RetainStrip.create(arg1, typeof arg2 == 'number' ? arg2 : arg1);
  } else if (typeof arg1 === 'string') {
    return InsertStrip.create(arg1);
  }
  return Strip.EMPTY;
}

export function deserializeStrips(values: SerializedChangeset = []): Strips {
  if (!values || values.length === 0) return Strips.EMPTY;
  return new Strips(values.map((value) => deserializeStrip(value)));
}

export function deserializeChangesetVar(...values: SerializedStrip[]): Changeset {
  return deserializeChangeset(values);
}

export function deserializeChangeset(values: SerializedChangeset = []): Changeset {
  if (!values || values.length === 0) return Changeset.EMPTY;
  return new Changeset(deserializeStrips(values));
}

export function deserializeRevisionChangeset(
  value: SerializedRevisionChangeset
): RevisionChangeset {
  return new RevisionChangeset(value.revision, deserializeStrips(value.changeset));
}

export function serializeStrip(strip: Strip): SerializedStrip {
  if (strip instanceof InsertStrip) {
    return strip.value;
  } else if (strip instanceof RetainStrip) {
    if (strip.startIndex !== strip.endIndex) {
      return [strip.startIndex, strip.endIndex];
    } else {
      return strip.startIndex;
    }
  }
  return null;
}

export function serializeStrips(strips: Readonly<Strips>): SerializedStrips {
  return strips.values.map((strip) => serializeStrip(strip));
}

export function serializeChangeset(changeset: Readonly<Changeset>): SerializedChangeset {
  return serializeStrips(changeset.strips);
}

export function serializeRevisionChangeset(
  changes: RevisionChangeset
): SerializedRevisionChangeset {
  return {
    revision: changes.revision,
    changeset: serializeChangeset(changes),
  };
}
