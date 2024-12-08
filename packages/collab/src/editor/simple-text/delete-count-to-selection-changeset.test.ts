import { expect, it } from 'vitest';

import { Changeset } from '../../changeset';

import { deleteCountToSelectionChangeset } from './delete-count-to-selection-changeset';

const cs = Changeset.parseValue;

it.each([
  {
    desc: 'deletes text in the middle',
    initialText: 'preexisting text value',
    range: {
      start: 16,
      end: 16,
    },
    deleteCount: 5,
    expectedChangeset: [
      [0, 10],
      [16, 21],
    ],
    expectedSelectionPos: 11,
  },
  {
    desc: 'deleting at returns identity changesets',
    initialText: 'preexisting text value',
    range: {
      start: 0,
      end: 0,
    },
    deleteCount: 3,
    expectedChangeset: [[0, 21]],
    expectedSelectionPos: 0,
  },
  {
    desc: 'deleting once deletes selection',
    initialText: 'preexisting text value',
    range: {
      start: 11,
      end: 16,
    },
    deleteCount: 1,
    expectedChangeset: [
      [0, 10],
      [16, 21],
    ],
    expectedSelectionPos: 11,
  },
  {
    desc: 'deletes selection plus any remainder count',
    initialText: 'preexisting text value',
    range: {
      start: 11,
      end: 16,
    },
    deleteCount: 3,
    expectedChangeset: [
      [0, 8],
      [16, 21],
    ],
    expectedSelectionPos: 9,
  },
  {
    desc: 'delete count 0',
    initialText: 'value',
    range: {
      start: 2,
      end: 2,
    },
    deleteCount: 0,
    expectedChangeset: [[0, 4]],
    expectedSelectionPos: 2,
  },
])(
  '$desc',
  ({ initialText, range, deleteCount, expectedChangeset, expectedSelectionPos }) => {
    const selCs = deleteCountToSelectionChangeset(deleteCount, initialText, range);

    expect(selCs.changeset.toString()).toStrictEqual(cs(expectedChangeset).toString());
    expect(selCs.afterSelection.start).toStrictEqual(expectedSelectionPos);
  }
);
