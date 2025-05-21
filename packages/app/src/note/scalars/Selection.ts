import { FieldPolicy } from '@apollo/client';

import { Selection as CollabSelection } from '../../../../collab/src';

function parseSelection(value: unknown) {
  if (value == null) {
    return value;
  } else if (value instanceof CollabSelection) {
    return value;
  } else if (typeof value === 'string') {
    return CollabSelection.parse(value);
  } else {
    console.error(value);
    throw new Error(`Failed to parse Selection`);
  }
}

function serializeSelection(value: unknown) {
  if (value instanceof CollabSelection) {
    return value.serialize();
  } else if (typeof value === 'string') {
    return value;
  } else {
    console.error(value);
    throw new Error(`Failed to serialize Selection`);
  }
}

function createSelectionPolicy(nullable?: boolean): FieldPolicy<unknown, unknown> {
  const readExisting = nullable ? null : undefined;
  return {
    read: (existing = readExisting) => {
      return parseSelection(existing);
    },
    merge: (_, incoming) => {
      return serializeSelection(incoming);
    },
  };
}

export const Selection = createSelectionPolicy(false);
export const SelectionNullable = createSelectionPolicy(true);
