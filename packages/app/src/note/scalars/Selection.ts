import { FieldPolicy } from '@apollo/client';

import { Selection as CollabSelection } from '../../../../collab2/src';

function parseSelection(value: unknown) {
  if (value == null) {
    return value;
  } else if (value instanceof CollabSelection) {
    return value;
  } else if (typeof value === 'string') {
    return CollabSelection.parse(value);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    throw new Error(`Failed parse Selection: ${String(value)}`);
  }
}
function createSelectionPolicy(nullable?: boolean): FieldPolicy<unknown, unknown> {
  const readExisting = nullable ? null : undefined;
  return {
    read: (existing = readExisting) => {
      return parseSelection(existing);
    },
    merge: (_, incoming) => {
      return parseSelection(incoming);
    },
  };
}

export const Selection = createSelectionPolicy(false);
export const SelectionNullable = createSelectionPolicy(true);
