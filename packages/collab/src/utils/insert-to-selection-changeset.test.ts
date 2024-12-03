import { expect, it } from 'vitest';

import { Changeset } from '../changeset';

import { insertToSelectionChangeset } from './insert-to-selection-changeset';

const cs = Changeset.parseValue;

it.each([
  {
    desc: 'inserts to empty value',
    initialText: '',
    insertText: 'first',
    expectedChangeset: ['first'],
    expectedSelectionPos: 5,
  },
  {
    desc: 'inserts at start',
    initialText: 'preexisting text value',
    range: {
      start: 0,
      end: 0,
    },
    insertText: 'start',
    expectedChangeset: ['start', [0, 21]],
    expectedSelectionPos: 5,
  },
  {
    desc: 'inserts between current position',
    initialText: 'preexisting text value',
    range: {
      start: 11,
      end: 11,
    },
    insertText: ' fill',
    expectedChangeset: [[0, 10], ' fill', [11, 21]],
    expectedSelectionPos: 16,
  },
  {
    desc: 'inserts at end',
    initialText: 'preexisting text value',
    range: {
      start: -1,
      end: -1,
    },
    insertText: 'end',
    expectedChangeset: [[0, 21], 'end'],
    expectedSelectionPos: 25,
  },
  {
    desc: 'selection is deleted on insert',
    initialText: 'preexisting text value',
    range: {
      start: 12,
      end: 16,
    },
    insertText: 'random',
    expectedChangeset: [[0, 11], 'random', [16, 21]],
    expectedSelectionPos: 18,
  },
])(
  '$desc',
  ({ range, initialText, insertText, expectedChangeset, expectedSelectionPos }) => {
    const selChangeset = insertToSelectionChangeset(
      insertText,
      initialText,
      range ?? { start: 0, end: 0 }
    );

    expect(selChangeset.changeset.toString()).toStrictEqual(
      cs(expectedChangeset).toString()
    );
    expect(selChangeset.afterSelection.start).toStrictEqual(expectedSelectionPos);
  }
);
