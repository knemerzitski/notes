import { FieldPolicy } from '@apollo/client';

import { Maybe } from '../../../../utils/src/types';

function parseDate(value: Maybe<number | string | Date>) {
  if (value == null) {
    return value;
  } else if (value instanceof Date) {
    return value;
  } else {
    return new Date(value);
  }
}
function createDateTimePolicy(
  nullable?: boolean
): FieldPolicy<Maybe<Date>, Maybe<string | Date>> {
  const readExisting = nullable ? null : undefined;
  return {
    read: (existing = readExisting) => {
      return parseDate(existing);
    },
    merge: (_, incoming) => {
      return parseDate(incoming);
    },
  };
}

export const DateTime = createDateTimePolicy(false);
export const DateTimeNullable = createDateTimePolicy(true);
