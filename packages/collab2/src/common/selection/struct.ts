import { number, coerce, Struct, instance, string } from 'superstruct';
import { Selection } from '.';

const RANGE_SEPARATOR = ':';

type InstanceTypeAny<TClass> = InstanceType<(new () => never) & TClass>;

const privateInstance = function <T>(Class: T): Struct<InstanceTypeAny<T>, null> {
  // @ts-expect-error instance() doesn't call new so it's safe
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return instance(Class);
};

// 5 or 5:10

export const SelectionStruct = coerce(
  privateInstance(Selection),
  string(),
  (value) => {
    const [startStr, endStr] = value.split(RANGE_SEPARATOR);

    const start = startStr !== undefined ? IntStruct.create(startStr) : 0;
    const end = endStr !== undefined ? IntStruct.create(endStr) : start;

    return Selection.create(start, end);
  },
  (value) => {
    if (value.isCollapsed()) {
      return IntStruct.createRaw(value.start);
    }

    return `${IntStruct.createRaw(value.start)}${RANGE_SEPARATOR}${IntStruct.createRaw(value.end)}`;
  }
);

const IntStruct = coerce(
  number(),
  string(),
  (value) => Number.parseInt(value),
  (value) => value.toString()
);
