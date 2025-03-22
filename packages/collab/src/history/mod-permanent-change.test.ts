import { describe, it, expect } from 'vitest';

import { Changeset } from '../changeset';

import { ComposableRecordsFacade } from '../records/composable-records-facade';

import { ReadonlyHistoryRecord } from './collab-history';
import {
  permanentChangeModification,
  PermanentChangeModificationContext,
} from './mod-permanent-change';
import { TextMemoRecords } from '../records/text-memo-records';

function createRecord(changeset: unknown): ReadonlyHistoryRecord {
  return {
    changeset: Changeset.parseValue(changeset),
    afterSelection: {
      start: 0,
      end: 0,
    },
    beforeSelection: {
      start: 0,
      end: 0,
    },
  };
}

describe('permanentChangeModification', () => {
  it.each([
    {
      msg: 'at start',
      populate: {
        serverTailTransform: null,
        tail: ['abcd'],
        records: [[[0, 3], 'e']], // abcde
      },
      permanent: ['0', [0, 4]], // 0abcde
      expected: {
        // serverTail * serverTailTransform  = tail
        serverTailTransform: ['0', [0, 3]],
        tail: ['0abcd'],
        head: ['0abcde'],
        records: [[[0, 4], 'e']],
      },
    },
    {
      msg: 'existing serverTailTransform',
      populate: {
        // ['ab'] * [0] = ['a']
        serverTailTransform: [0],
        tail: ['a'],
        records: [['a']], // a
      },
      permanent: [0, '1'], // a1
      expected: {
        serverTailTransform: [0, '1'],
        tail: ['a1'],
        head: ['a1'],
        records: [['a', 1]],
      },
    },
    {
      msg: 'delete all',
      populate: {
        serverTailTransform: null,
        tail: ['abcd'],
        records: [[[0, 3], 'e']], // abcde
      },
      permanent: [],
      expected: {
        serverTailTransform: [],
        tail: [],
        head: [],
        records: [[]],
      },
    },
  ])('$msg', ({ populate, permanent, expected }) => {
    const memoRecords = new TextMemoRecords<ReadonlyHistoryRecord>({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      records: (populate?.records ?? []).map(createRecord),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      tailText: populate?.tail ? Changeset.parseValue(populate.tail) : Changeset.EMPTY,
    });
    const safeRecords = new ComposableRecordsFacade(memoRecords);

    let serverTailTextTransformToRecordsTailText: Changeset | null =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      populate.serverTailTransform
        ? Changeset.parseValue(populate.serverTailTransform)
        : null;

    const historyContext: PermanentChangeModificationContext = {
      serverTailTextTransformToRecordsTailText,
      records: memoRecords,
      modification(changes) {
        if (changes.serverTailTextTransformToRecordsTailText !== undefined) {
          serverTailTextTransformToRecordsTailText =
            changes.serverTailTextTransformToRecordsTailText;
        }
        if (
          changes.recordsTailText !== undefined &&
          changes.recordsSplice !== undefined
        ) {
          safeRecords.replaceTailTextAndSplice(
            changes.recordsTailText,
            changes.recordsSplice.start,
            changes.recordsSplice.deleteCount,
            ...changes.recordsSplice.records
          );
        }
      },
    };

    permanentChangeModification(Changeset.parseValue(permanent), historyContext);

    if (serverTailTextTransformToRecordsTailText) {
      expect(serverTailTextTransformToRecordsTailText.length).toStrictEqual(
        memoRecords.tailText.length
      );
    }

    // Server tail match
    expect(serverTailTextTransformToRecordsTailText?.toString()).toStrictEqual(
      Changeset.parseValue(expected.serverTailTransform).toString()
    );

    // Tail match
    expect(memoRecords.tailText.toString()).toStrictEqual(
      Changeset.parseValue(expected.tail).toString()
    );

    // History records match
    expect(memoRecords.items.map(({ changeset }) => changeset.toString())).toStrictEqual(
      expected.records.map((r) => Changeset.parseValue(r).toString())
    );

    // Head match
    expect(memoRecords.getTextAt(memoRecords.length - 1).toString()).toStrictEqual(
      Changeset.parseValue(expected.head).toString()
    );
  });
});
