import { assert, describe, expect, it } from 'vitest';

import { deletionCountOperation, insertionOperation } from './changeset-operations';
import { Changeset } from '../changeset';

const cs = Changeset.parseValue;

describe('insertionOperation', () => {
  it.each([
    {
      desc: 'inserts to empty value',
      initialText: '',
      insertText: 'first',
      expectedChangeset: ['first'],
      expectedInverseChangeset: [null],
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
      expectedInverseChangeset: [[5, 26]],
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
      expectedInverseChangeset: [
        [0, 10],
        [16, 26],
      ],
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
      expectedInverseChangeset: [[0, 21]],
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
      expectedInverseChangeset: [[0, 11], 'text', [18, 23]],
      expectedSelectionPos: 18,
    },
  ])(
    '$desc',
    ({
      range,
      initialText,
      insertText,
      expectedChangeset,
      expectedInverseChangeset,
      expectedSelectionPos,
    }) => {
      const { changeset, inverseChangeset, selection } = insertionOperation(
        insertText,
        initialText,
        range ?? { start: 0, end: 0 }
      );

      expect(changeset.toString()).toStrictEqual(cs(expectedChangeset).toString());
      expect(inverseChangeset.toString()).toStrictEqual(
        cs(expectedInverseChangeset).toString()
      );
      expect(selection.start).toStrictEqual(expectedSelectionPos);

      // Validate correctness of inverse changeset
      const valueChangeset = cs([initialText]);
      expect(
        valueChangeset
          .compose(changeset)
          .compose(inverseChangeset)
          .strips.joinInsertions()
      ).toStrictEqual(initialText);
    }
  );
});

describe('deletionCountOperation', () => {
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
      expectedInverseChangeset: [[0, 10], ' text', [11, 16]],
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
      expectedInverseChangeset: [[0, 21]],
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
      expectedInverseChangeset: [[0, 10], ' text', [11, 16]],
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
      expectedInverseChangeset: [[0, 8], 'ng text', [9, 14]],
      expectedSelectionPos: 9,
    },
  ])(
    '$desc',
    ({
      initialText,
      range,
      deleteCount,
      expectedChangeset,
      expectedInverseChangeset,
      expectedSelectionPos,
    }) => {
      const delOp = deletionCountOperation(deleteCount, initialText, range);
      assert(delOp != null);
      const { changeset, inverseChangeset, selection } = delOp;

      expect(changeset.toString()).toStrictEqual(cs(expectedChangeset).toString());
      expect(inverseChangeset.toString()).toStrictEqual(
        cs(expectedInverseChangeset).toString()
      );
      expect(selection.start).toStrictEqual(expectedSelectionPos);

      // Validate correctness of inverse changeset
      const valueChangeset = cs([initialText]);
      expect(
        valueChangeset
          .compose(changeset)
          .compose(inverseChangeset)
          .strips.joinInsertions()
      ).toStrictEqual(initialText);
    }
  );
});
