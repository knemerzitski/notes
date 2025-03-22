import { describe, it, expect } from 'vitest';

import { Changeset } from '../changeset';

import { ComposableRecordsFacade } from '../records/composable-records-facade';
import { TextMemoRecords } from '../records/text-memo-records';

import { ReadonlyHistoryRecord } from './collab-history';
import { ExternalChangeModificationContext, externalChangeModification } from './mod-external-change';

function createRecord(rawChangeset: unknown): ReadonlyHistoryRecord {
  return {
    changeset: Changeset.parseValue(rawChangeset),
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

describe('externalChangeModification', () => {
  function createHistory({
    records,
    serverIndex,
    tailText = Changeset.EMPTY,
    clientChangeset = Changeset.EMPTY,
  }: {
    records: Parameters<typeof createRecord>[0][];
    serverIndex: number;
    tailText?: Changeset;
    clientChangeset?: Changeset;
  }) {
    let serverTailTextTransformToRecordsTailText: Changeset | null = null;
    const memoRecords = new TextMemoRecords<ReadonlyHistoryRecord>({
      records: records.map(createRecord),
      tailText,
    });
    const safeRecords = new ComposableRecordsFacade(memoRecords);

    return {
      context: {
        serverIndex,
        client: {
          server: clientChangeset,
        },
        records: memoRecords,
        serverTailTextTransformToRecordsTailText,
        modification(changes) {
          if (changes.serverTailTextTransformToRecordsTailText !== undefined) {
            serverTailTextTransformToRecordsTailText =
              changes.serverTailTextTransformToRecordsTailText;
          }
          if (changes.recordsSplice && changes.recordsTailText) {
            safeRecords.replaceTailTextAndSplice(
              changes.recordsTailText,
              changes.recordsSplice.start,
              changes.recordsSplice.deleteCount,
              ...changes.recordsSplice.records
            );
          }
        },
      } satisfies ExternalChangeModificationContext,
      records: memoRecords,
      get serverTailTextTransformToRecordsTailText() {
        return serverTailTextTransformToRecordsTailText;
      },
    };
  }

  it('inserts at start on middle target index', () => {
    const history = createHistory({
      records: [
        ['cd'],
        ['ab', [0, 1]],
        [[0, 1], '|', [2, 3]],
        [[0, 4], 'efghijklmn'], // ab|cdefghijklmn
        ['B', [3, 5], 'GH', [9, 14]],
        ['_', [0, 3], '_', [4, 11]],
      ],
      serverIndex: 3,
    });

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toMatchInlineSnapshot(`"(0 -> 14)["_Bcde_GHijklmn"]"`);

    externalChangeModification(
      Changeset.parseValue(['[before cd]', [0, 14]]),
      history.context
    );

    expect(history.records.tailText.toString()).toStrictEqual('(0 -> 11)["[before cd]"]');

    expect(
      history.records.items.map((record) => record.changeset.toString())
    ).toStrictEqual([
      '(11 -> 13)[0 - 10, "cd"]',
      '(13 -> 15)[0 - 10, "ab", 11 - 12]',
      '(15 -> 16)[0 - 12, "|", 13 - 14]',
      '(16 -> 26)[0 - 15, "efghijklmn"]',
      '(26 -> 23)["B", 0 - 10, 14 - 16, "GH", 20 - 25]',
      '(23 -> 25)["_", 0 - 14, "_", 15 - 22]',
    ]);

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toStrictEqual('(0 -> 25)["_B[before cd]cde_GHijklmn"]');
  });

  it('deletes middle on middle target index', () => {
    const history = createHistory({
      records: [
        ['cd'],
        ['ab', [0, 1]],
        [[0, 1], '|', [2, 3]],
        [[0, 4], 'efghijklmn'], // ab|cdefghijklmn
        ['B', [3, 5], 'GH', [9, 14]],
        ['_', [0, 3], '_', [4, 11]],
      ],
      serverIndex: 3,
    });

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toMatchInlineSnapshot(`"(0 -> 14)["_Bcde_GHijklmn"]"`);

    externalChangeModification(
      Changeset.parseValue(['[del ij]', [0, 8], [11, 14]]),
      history.context
    );

    expect(history.records.tailText.toString()).toStrictEqual('(0 -> 8)["[del ij]"]');

    expect(
      history.records.items.map((record) => record.changeset.toString())
    ).toStrictEqual([
      '(8 -> 10)[0 - 7, "cd"]',
      '(10 -> 12)[0 - 7, "ab", 8 - 9]',
      '(12 -> 13)[0 - 9, "|", 10 - 11]',
      '(13 -> 21)[0 - 12, "efghklmn"]',
      '(21 -> 18)["B", 0 - 7, 11 - 13, "GH", 17 - 20]',
      '(18 -> 20)["_", 0 - 11, "_", 12 - 17]',
    ]);

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toStrictEqual('(0 -> 20)["_B[del ij]cde_GHklmn"]');
  });

  it('removes a record that is no longer meaningful', () => {
    const history = createHistory({
      records: [
        ['cd'],
        ['ab', [0, 1]],
        [[0, 1], '|', [2, 3]],
        [[0, 4], 'efghijklmn'], // ab|cdefghijklmn
        ['B', [3, 5], 'GH', [9, 14]],
        ['_', [0, 3], '_', [4, 11]],
      ],
      serverIndex: 1,
    });

    // remove "ab", keep "cd" on entry 1
    externalChangeModification(Changeset.parseValue([[2, 3]]), history.context);

    expect(history.records.tailText.toString()).toStrictEqual('(0 -> 0)[]');

    expect(
      history.records.items.map((record) => record.changeset.toString())
    ).toStrictEqual([
      '(0 -> 2)["cd"]',
      '(2 -> 2)[0 - 1]', // identity
      '(2 -> 3)["|", 0 - 1]',
      '(3 -> 13)[0 - 2, "efghijklmn"]',
      '(13 -> 12)["B", 1 - 3, "GH", 7 - 12]',
      '(12 -> 14)["_", 0 - 3, "_", 4 - 11]',
    ]);

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toStrictEqual('(0 -> 14)["_Bcde_GHijklmn"]');
  });

  it('removes all older records', () => {
    const history = createHistory({
      records: [
        ['cd'],
        ['ab', [0, 1]],
        [[0, 1], '|', [2, 3]],
        [[0, 4], 'efghijklmn'], // ab|cdefghijklmn
        ['B', [3, 5], 'GH', [9, 14]],
        ['_', [0, 3], '_', [4, 11]],
      ],
      serverIndex: 4,
    });

    // from entry 4, delete everything
    externalChangeModification(Changeset.parseValue([]), history.context);

    expect(history.records.tailText.toString()).toStrictEqual('(0 -> 0)[]');

    expect(
      history.serverTailTextTransformToRecordsTailText?.toString()
    ).toMatchInlineSnapshot(`"(0 -> 0)[]"`);

    expect(
      history.records.items.map((record) => record.changeset.toString())
    ).toStrictEqual([
      '(0 -> 0)[]',
      '(0 -> 0)[]',
      '(0 -> 0)[]',
      '(0 -> 0)[]',
      '(0 -> 0)[]',
      '(0 -> 2)["__"]',
    ]);

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toStrictEqual('(0 -> 2)["__"]');
  });

  it('replaces tailText', () => {
    const history = createHistory({
      records: [
        ['cd'],
        ['ab', [0, 1]],
        [[0, 1], '|', [2, 3]],
        [[0, 4], 'efghijklmn'], // ab|cdefghijklmn
        ['B', [3, 5], 'GH', [9, 14]],
        ['_', [0, 3], '_', [4, 11]],
      ],
      serverIndex: -1,
      clientChangeset: Changeset.parseValue(['[new start bla]']),
    });

    externalChangeModification(
      Changeset.parseValue([[0, 4], 'start', [5, 9]]),
      history.context
    );

    expect(history.records.tailText.toString()).toStrictEqual(
      '(0 -> 15)["[new start bla]"]'
    );

    expect(
      history.records.items.map((record) => record.changeset.toString())
    ).toStrictEqual([
      '(10 -> 7)["cd", 5 - 9]',
      '(7 -> 9)["ab", 0 - 6]',
      '(9 -> 10)[0 - 1, "|", 2 - 8]',
      '(10 -> 20)[0 - 4, "efghijklmn", 5 - 9]',
      '(20 -> 17)["B", 3 - 5, "GH", 9 - 19]',
      '(17 -> 19)["_", 0 - 3, "_", 4 - 16]',
    ]);

    expect(
      history.records.items
        .reduce((a, b) => a.compose(b.changeset), history.records.tailText)
        .toString()
    ).toStrictEqual('(0 -> 19)["_Bcde_GHijklmnstart"]');
  });
});
