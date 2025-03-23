import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';

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
export function createDateTimePolicy(options?: {
  nullable?: boolean;
  read?: (existing: Maybe<Date>, options: FieldFunctionOptions) => Maybe<Date>;
  merge?: (
    existing: Maybe<Date>,
    incoming: Maybe<Date>,
    options: FieldFunctionOptions
  ) => Readonly<Maybe<Date>> | null | undefined;
}): FieldPolicy<Maybe<Date>, Maybe<string | Date>> {
  const rootOptions = options;

  const readExisting = rootOptions?.nullable ? null : undefined;

  return {
    read: (existing = readExisting, options) => {
      const existingDate = parseDate(existing);
      return rootOptions?.read?.(existingDate, options) ?? existingDate;
    },
    merge: (existing, incoming, options) => {
      const incomingDate = parseDate(incoming);
      return rootOptions?.merge?.(existing, incomingDate, options) ?? incomingDate;
    },
  };
}

export const DateTime = createDateTimePolicy({
  nullable: false,
});
export const DateTimeNullable = createDateTimePolicy({
  nullable: true,
});
