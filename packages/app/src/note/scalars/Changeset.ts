import { FieldPolicy } from '@apollo/client';
import { Changeset as CollabChangeset } from '~collab/changeset';

function parseChangeset(value: unknown) {
  if (value == null) {
    return value;
  } else if (value instanceof CollabChangeset) {
    return value;
  } else {
    return CollabChangeset.parseValue(value);
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
