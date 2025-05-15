import { describe, it, expect } from 'vitest';

import { Changeset } from '../changeset';

import { ComposableRecordsFacade } from '../records/composable-records-facade';

import {
  unshiftRecordsModification,
  HistoryUnshiftEntry,
  UnshiftRecordsModificationContext,
} from './mod-unshift-records';

function createEntry(changeset: unknown, external?: boolean): HistoryUnshiftEntry {
  if (external) {
    return {
      source: 'external',
      changeset: Changeset.parseValue(changeset),
    };
  } else {
    return {
      type: 'execute',
      source: 'local',
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
}

// TODO mod-unshift-records is not used but reuse tests
describe.skip('unshiftRecordsModification', () => {
  it.each([
    {
      msg: 'one entry replace tail abcd => cd',
      populate: {
        tail: ['abcd'],
        records: [[[0, 3], 'e']], // abcde
      },
      unshift: {
        newTail: ['cd'], // cd
        entries: [{ cs: ['ab', [0, 1]], external: false }], // abcd
      },
      expected: {
        tail: ['cd'],
        head: ['abcde'],
        entries: [
          ['ab', [0, 1]],
          [[0, 3], 'e'],
        ],
      },
    },
    {
      msg: 'two tails between',
      unshift: {
        newTail: [],
        entries: [
          { cs: ['a'] },
          { cs: [0, 'b'], external: true },
          { cs: [[0, 1], 'c'], external: true },
          { cs: [[0, 2], 'd'] },
        ],
      },
      expected: {
        tail: ['bc'],
        head: ['abcd'],
        entries: [
          ['a', [0, 1]],
          [[0, 2], 'd'],
        ],
      },
    },
    {
      msg: 'complex entries',
      populate: {
        tail: ['abcdefgh'],
        records: [
          ['_', [0, 7], '_'],
          [[0, 3], 'DDD', [5, 9]],
        ],
      },
      unshift: {
        newTail: ['bf'],
        entries: [
          { cs: [0, 'd', 1] },
          { cs: ['replaced'] },
          { cs: ['ab', 7, 'fh'], external: true },
          { cs: [[0, 3], 'g', 4] },
          { cs: [[0, 1], 'c', [2, 5]], external: true },
          { cs: [[0, 3], 'emany', [4, 6]], external: true },
          {
            cs: [
              [0, 4],
              [9, 11],
            ],
            external: true,
          },
        ],
      },
      expected: {
        tail: ['abcbfefh'],
        head: ['_abcDDDefgh_'],
        entries: [
          [[0, 3], 'd', [4, 7]],
          [[0, 2], 'd', [6, 8]],
          [[0, 5], 'g', 6],
          ['_', [0, 7], '_'],
          [[0, 3], 'DDD', [5, 9]],
        ],
      },
    },
  ])('creates correct tail and records: $msg', ({ populate, unshift, expected }) => {
    const historyRecords = populate?.records.map((c) => Changeset.parseValue(c)) ?? [];
    let tailText = populate?.tail ? Changeset.parseValue(populate.tail) : Changeset.EMPTY;

    const recordsFacade = new ComposableRecordsFacade({
      get tailText() {
        return tailText;
      },
      set tailText(value) {
        tailText = value;
      },
      at(index) {
        const changeset = historyRecords[index];
        if (!changeset) {
          return;
        }
        return { changeset };
      },
      clear() {
        historyRecords.length = 0;
      },
      push(record) {
        historyRecords.push(record.changeset);
      },
      get length() {
        return historyRecords.length;
      },
      splice(start, deleteCount, ...records) {
        historyRecords.splice(start, deleteCount, ...records.map((r) => r.changeset));
      },
    });

    let serverTailTextTransformToRecordsTailText: Changeset | null = null;

    const historyContext: UnshiftRecordsModificationContext = {
      serverTailTextTransformToRecordsTailText,
      modification(changes) {
        if (changes.serverTailTextTransformToRecordsTailText !== undefined) {
          serverTailTextTransformToRecordsTailText =
            changes.serverTailTextTransformToRecordsTailText;
        }
        if (
          changes.recordsTailText !== undefined &&
          changes.recordsSplice !== undefined
        ) {
          recordsFacade.replaceTailText(changes.recordsTailText);
          recordsFacade.splice(
            changes.recordsSplice.start,
            changes.recordsSplice.deleteCount,
            ...changes.recordsSplice.records
          );
        }
      },
    };

    unshiftRecordsModification(
      {
        newRecordsTailText: {
          changeset: Changeset.parseValue(unshift.newTail),
          revision: 0,
        },
        newEntries: unshift.entries.map(({ cs, external }) => createEntry(cs, external)),
      },
      historyContext
    );

    // Tail match
    expect(tailText.toString()).toStrictEqual(
      Changeset.parseValue(expected.tail).toString()
    );

    // History records match
    expect(historyRecords.map((c) => c.toString())).toStrictEqual(
      expected.entries.map((r) => Changeset.parseValue(r).toString())
    );

    // Head match
    expect(
      historyRecords.reduce((a, b) => a.compose(b), tailText).toString()
    ).toStrictEqual(Changeset.parseValue(expected.head).toString());
  });
});
