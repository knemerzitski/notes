import {
  array,
  coerce,
  createRaw,
  define,
  instance,
  min,
  nonempty,
  number,
  optional,
  refine,
  string,
  tuple,
  union,
  unknown,
} from 'superstruct';

import { Changeset, InsertStrip, RetainStrip, Strip, Strips } from '.';

const IsEmptyStripStruct = define<Strip>('EMPTY', (v) => v === Strip.EMPTY);

export const EmptyStripStruct = coerce(
  IsEmptyStripStruct,
  unknown(),
  () => Strip.EMPTY,
  () => null
);

const NonNegativeStruct = min(number(), 0);

const RangeStruct = refine(
  tuple([NonNegativeStruct, optional(NonNegativeStruct)]),
  'NumberRange',
  (value) => (value[1] !== undefined ? value[0] <= value[1] : true)
);

export const RetainStripStruct = coerce(
  instance(RetainStrip),
  union([NonNegativeStruct, RangeStruct]),
  (value) => {
    let startIndex: number, endIndex: number;
    if (typeof value === 'number') {
      startIndex = value;
      endIndex = value;
    } else {
      startIndex = value[0];
      endIndex = value[1] ?? value[0];
    }

    return new RetainStrip(startIndex, endIndex);
  },
  (strip) =>
    strip.startIndex !== strip.endIndex
      ? [strip.startIndex, strip.endIndex]
      : strip.startIndex
);

export const InsertStripStruct = coerce(
  instance(InsertStrip),
  nonempty(string()),
  (value) => new InsertStrip(value),
  (strip) => strip.value
);

export const StripStruct = union([
  InsertStripStruct,
  RetainStripStruct,
  EmptyStripStruct,
]);

const StripsValuesStruct = array(StripStruct);

export const StripsStruct = coerce(
  instance(Strips),
  array(unknown()),
  (value) => {
    if (value.length === 0) {
      return Strips.EMPTY;
    }
    return new Strips(StripsValuesStruct.create(value));
  },
  (strips) => createRaw(strips.values, StripsValuesStruct)
);

export const ChangesetStruct = coerce(
  define<Changeset>('instance', (value) => value instanceof Changeset),
  array(unknown()),
  (value) => {
    if (value.length === 0) {
      return Changeset.EMPTY;
    }
    return Changeset.new(StripsStruct.create(value));
  },
  (changeset) => createRaw(changeset.strips, StripsStruct)
);

const OptionalStruct = define<undefined>(
  'Undefined',
  (value) => typeof value === 'undefined'
);
export const OptionalChangesetStruct = union([OptionalStruct, ChangesetStruct]);
