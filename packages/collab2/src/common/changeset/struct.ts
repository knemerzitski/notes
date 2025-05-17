import {
  array,
  coerce,
  instance,
  nonempty,
  number,
  optional,
  string,
  Struct,
} from 'superstruct';

import { isDefined } from '../../../../utils/src/type-guards/is-defined';

import { stringSeparator } from './utils/string-separator';

import { Changeset, InsertStrip, RetainStrip, Strip } from '.';

const INPUT_LENGTH_SEPARATOR = ':';
const STRIPS_SEPARATOR = ',';
const RANGE_SEPARATOR = '-';

const STRING_BOUNDARY = '"';
const STRING_ESCAPE = '\\';

type InstanceTypeAny<TClass> = InstanceType<(new () => never) & TClass>;

const privateInstance = function <T>(Class: T): Struct<InstanceTypeAny<T>, null> {
  // @ts-expect-error instance() doesn't call new so it's safe
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return instance(Class);
};

export const ChangesetStruct = coerce(
  privateInstance(Changeset),
  string(),
  (value) => {
    if (value.length === 0) {
      return Changeset.EMPTY;
    }

    const inputLengthEnd = value.indexOf(INPUT_LENGTH_SEPARATOR);
    if (inputLengthEnd < 0) {
      throw new Error(`Missing input length separator "${INPUT_LENGTH_SEPARATOR}"`);
    }

    const inputLength = IntStruct.create(value.substring(0, inputLengthEnd));

    const stripsString = value.substring(inputLengthEnd + INPUT_LENGTH_SEPARATOR.length);
    const strips = StripsStruct.create(stripsString);

    return Changeset.create(inputLength, strips);
  },
  (changeset) => {
    const inputLength = IntStruct.createRaw(changeset.inputLength);
    const strips = StripsStruct.createRaw(changeset.strips);

    return `${inputLength}${INPUT_LENGTH_SEPARATOR}${strips}`;
  }
);

export const StripsStruct = coerce(
  array(privateInstance(Strip)),
  string(),
  (value) => {
    if (value.length === 0) {
      return [];
    }

    const stripStrings = stringSeparator(
      value,
      STRIPS_SEPARATOR,
      STRING_BOUNDARY,
      STRING_ESCAPE
    );

    return stripStrings.map((stripStr) => StripStruct.create(stripStr));
  },
  (value) =>
    value
      .map((strip) => StripStruct.createRaw(strip))
      .filter(isDefined)
      .join(STRIPS_SEPARATOR)
);

export const StripStruct = coerce(
  privateInstance(Strip),
  optional(string()),
  (value) => {
    if (!value) {
      throw new Error('Empty string is not a strip');
    }
    if (value.startsWith(STRING_BOUNDARY)) {
      return InsertStripStruct.create(value);
    } else {
      return RetainStripStruct.create(value);
    }
  },
  (value) => value.serialize()
);

export const InsertStripStruct = coerce(
  privateInstance(InsertStrip),
  nonempty(string()),
  (value) => {
    return InsertStrip.create(String(JSON.parse(value)));
  },
  (strip) => {
    return JSON.stringify(strip.value);
  }
);

export const RetainStripStruct = coerce(
  privateInstance(RetainStrip),
  nonempty(string()),
  (value) => {
    const startEnd = value.indexOf(RANGE_SEPARATOR);

    let start: number, endInclusive: number;
    if (startEnd >= 0) {
      start = IntStruct.create(value.substring(0, startEnd));
      endInclusive = IntStruct.create(value.substring(startEnd + RANGE_SEPARATOR.length));
    } else {
      start = IntStruct.create(value);
      endInclusive = start;
    }

    return RetainStrip.create(start, endInclusive + 1);
  },
  (strip) => {
    if (strip.length > 1) {
      return `${strip.start}${RANGE_SEPARATOR}${strip.end - 1}`;
    }

    return String(strip.start);
  }
);

const IntStruct = coerce(
  number(),
  string(),
  (value) => Number.parseInt(value),
  (value) => value.toString()
);
