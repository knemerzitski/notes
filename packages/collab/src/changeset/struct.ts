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

const StripsValuesStruct = optional(array(StripStruct));

export const StripsStruct = coerce(
  instance(Strips),
  optional(array(unknown())),
  (value) => new Strips(StripsValuesStruct.create(value)),
  (strips) => createRaw(strips.values, StripsValuesStruct)
);

export const ChangesetStruct = coerce(
  instance(Changeset),
  array(unknown()),
  (value) => new Changeset(StripsStruct.create(value)),
  (changeset) => createRaw(changeset.strips, StripsStruct)
);
