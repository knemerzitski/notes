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
    console.error(value);
    throw new Error('Failed to parse Changeset');
  }
}

function serializeChangeset(value: unknown) {
  if (value instanceof CollabChangeset) {
    return value.serialize();
  } else if (typeof value === 'string') {
    return value;
  } else {
    console.error(value);
    throw new Error('Failed to serialize Changeset');
  }
}

function createChangesetPolicy(nullable?: boolean): FieldPolicy<unknown, unknown> {
  const readExisting = nullable ? null : undefined;
  return {
    read: (existing = readExisting) => {
      return parseChangeset(existing);
    },
    merge: (_, incoming) => {
      return serializeChangeset(incoming);
    },
  };
}

export const Changeset = createChangesetPolicy(false);
export const ChangesetNullable = createChangesetPolicy(true);
