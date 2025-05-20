import { FieldPolicy } from '@apollo/client';

import { Changeset as CollabChangeset } from '../../../../collab/src';

function parseChangeset(value: unknown) {
  if (value == null) {
    return value;
  } else if (value instanceof CollabChangeset) {
    return value;
  } else if (typeof value === 'string') {
    return CollabChangeset.parse(value);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    throw new Error(`Failed parse Changeset: ${String(value)}`);
  }
}
function createChangesetPolicy(nullable?: boolean): FieldPolicy<unknown, unknown> {
  const readExisting = nullable ? null : undefined;
  return {
    read: (existing = readExisting) => {
      return parseChangeset(existing);
    },
    merge: (_, incoming) => {
      return parseChangeset(incoming);
    },
  };
}

export const Changeset = createChangesetPolicy(false);
export const ChangesetNullable = createChangesetPolicy(true);
