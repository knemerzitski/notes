/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, it } from 'vitest';

import { LocalServerRecords } from '../__tests__/helpers/server-records';
import { Changeset } from '../changeset';
import { SelectionRange } from '../client/selection-range';

import { UserRecords } from '../client/user-records';

import { RevisionRecords } from '../records/revision-records';

import { CollabHistory, HistoryRecord, HistoryRecordArrayStruct } from './collab-history';
import { CollabServiceRecord } from '../client/collab-service';

it('restores records from user records while having external change', () => {
  const userRecords = new UserRecords({
    serverRecords: new LocalServerRecords({
      records: new RevisionRecords<CollabServiceRecord>({
        tailText: {
          // a
          changeset: Changeset.parseValue(['a']),
          revision: 3,
        },
        records: [
          {
            revision: 4,
            // "ab"
            changeset: Changeset.parseValue([0, 'b']),
            afterSelection: SelectionRange.from(2),
            beforeSelection: SelectionRange.from(1),
            creatorUserId: 'A',
          },
          {
            // new history tail
            revision: 5,
            // "abc"
            changeset: Changeset.parseValue([[0, 1], 'c']),
            afterSelection: SelectionRange.from(3),
            beforeSelection: SelectionRange.from(2),
            creatorUserId: 'A',
          },
          {
            // old history tail
            // new entry
            revision: 6,
            // "abcd"
            changeset: Changeset.parseValue([[0, 2], 'd']),
            afterSelection: SelectionRange.from(4),
            beforeSelection: SelectionRange.from(3),
            creatorUserId: 'B',
          },
          {
            // existing entry
            revision: 7,
            // "abcde"
            changeset: Changeset.parseValue([[0, 3], 'e']),
            afterSelection: SelectionRange.from(5),
            beforeSelection: SelectionRange.from(4),
            creatorUserId: 'A',
          },
          {
            revision: 8,
            // "abcdef"
            changeset: Changeset.parseValue([[0, 4], 'f']),
            afterSelection: SelectionRange.from(6),
            beforeSelection: SelectionRange.from(5),
            creatorUserId: 'A',
          },
        ],
      }),
    }),
    userId: 'A',
  });

  const history = new CollabHistory({
    serverTailRecord: {
      changeset: Changeset.parseValue(['abcd']),
      revision: 6,
    },
    lastExecutedIndex: {
      server: 0,
      submitted: 0,
      execute: 0,
    },
    serverToLocalHistoryTransform: null,
    records: [
      {
        // abcde
        type: 'execute',
        changeset: Changeset.parseValue([[0, 3], 'e']),
        afterSelection: SelectionRange.from(5),
        beforeSelection: SelectionRange.from(4),
        serverRecord: {
          revision: 7,
          changeset: Changeset.parseValue([[0, 3], 'e']),
        },
      },
    ],
  });

  // "abcdef"
  history.handleExternalChange({
    revision: 8,
    changeset: Changeset.parseValue([[0, 4], 'f']),
  });

  history.restoreFromUserRecords(userRecords, 1);
});

// TODO copied to collab2
it('undo/redo with external changes', () => {
  const history = new CollabHistory();
  const client = history;

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue(['a']),
    afterSelection: SelectionRange.from(1),
  });
  //a

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([0, 'b']),
    afterSelection: SelectionRange.from(2),
  });
  //ab

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([[0, 1], 'c']),
    afterSelection: SelectionRange.from(3),
  });
  //abc
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"abc"`);

  client.handleExternalChange({
    revision: 1,
    changeset: Changeset.parseValue(['X']),
  });
  //Xabc
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"Xabc"`);

  client.submitChanges();
  client.submittedChangesAcknowledged({
    revision: 2,
    changeset: history.submitted,
  });

  client.handleExternalChange({
    revision: 3,
    changeset: Changeset.parseValue([0, 'Y', [1, 3]]),
  });
  //XYabc
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc"`);

  client.handleExternalChange({
    revision: 4,
    changeset: Changeset.parseValue([[0, 4], '2']),
  });
  //XYabc2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc2"`);

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([[0, 4], 'd', 5]),
    afterSelection: SelectionRange.from(6),
  });
  //XYabcd2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabcd2"`);

  client.handleExternalChange({
    revision: 5,
    changeset: Changeset.parseValue([[0, 4], '1', 5]),
  });
  //XYabc1d2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc1d2"`);

  history.undo();
  //XYabc12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc12"`);

  history.undo();
  //XYab12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYab12"`);

  history.undo();
  //XYa12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYa12"`);

  history.undo();
  //XY12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XY12"`);

  history.undo();
  //XY12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XY12"`);

  history.redo();
  //XYa12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYa12"`);

  history.redo();
  //XYab12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYab12"`);

  history.redo();
  //XYabc12
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc12"`);

  history.redo();
  //XYabc1d2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc1d2"`);

  history.redo();
  //XYabc1d2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc1d2"`);
});

// TODO copied to collab2
it('undo changes', () => {
  const history = new CollabHistory();
  const client = history;

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue(['a']),
    afterSelection: SelectionRange.from(1),
  });
  expect(client.view.joinInsertions()).toStrictEqual('a');
  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([0, 'b']),
    afterSelection: SelectionRange.from(2),
  });
  expect(client.view.joinInsertions()).toStrictEqual('ab');
  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([[0, 1], 'c']),
    afterSelection: SelectionRange.from(3),
  });
  expect(client.view.joinInsertions()).toStrictEqual('abc');

  history.undo();
  expect(client.view.joinInsertions()).toStrictEqual('ab');
  history.undo();
  expect(client.view.joinInsertions()).toStrictEqual('a');
  history.undo();
  expect(client.view.joinInsertions()).toStrictEqual('');
  history.undo();
  expect(client.view.joinInsertions()).toStrictEqual('');
});

it('restored re-serializes to same value', () => {
  const serializedHistoryOptions = {
    records: [
      {
        afterSelection: {
          start: 3,
        },
        beforeSelection: {
          start: 2,
        },
        changeset: [[0, 1], 'c', [2, 3]],
        type: 'execute',
      },
      {
        afterSelection: {
          start: 5,
        },
        beforeSelection: {
          start: 4,
        },
        changeset: [[0, 3], 'e', 4],
        type: 'execute',
      },
    ],
    lastExecutedIndex: {
      execute: 1,
      server: 1,
      submitted: 1,
    },
    serverToLocalHistoryTransform: null,
    serverTailRecord: {
      changeset: ['abdf'],
      revision: 4,
    },
  };

  const parsedHistory = new CollabHistory({
    ...CollabHistory.parseValue(serializedHistoryOptions),
  });

  const againSerializedHistoryOptions = parsedHistory.serialize(true);

  expect(serializedHistoryOptions).toStrictEqual(againSerializedHistoryOptions);
});

it('serializes selection correctly', () => {
  const records: HistoryRecord[] = [
    {
      type: 'execute',
      changeset: Changeset.EMPTY,
      afterSelection: SelectionRange.from(1),
      beforeSelection: SelectionRange.from(0),
    },
    {
      type: 'execute',
      changeset: Changeset.EMPTY,
      afterSelection: SelectionRange.from(2),
      beforeSelection: SelectionRange.from(1),
    },
  ];

  expect(HistoryRecordArrayStruct.createRaw(records)).toMatchInlineSnapshot(`
    [
      {
        "afterSelection": {
          "start": 1,
        },
        "beforeSelection": {
          "start": 0,
        },
        "changeset": [],
        "type": "execute",
      },
      {
        "afterSelection": {
          "start": 2,
        },
        "changeset": [],
        "type": "execute",
      },
    ]
  `);
});

it('does not merge record at serverIndex', () => {
  const history = new CollabHistory({
    serverTailRecord: {
      changeset: Changeset.parseValue(['abcd']),
      revision: 6,
    },
    lastExecutedIndex: {
      server: 0,
      submitted: 0,
      execute: 0,
    },
    serverToLocalHistoryTransform: null,
    records: [
      {
        // abcde
        type: 'execute',
        changeset: Changeset.parseValue([[0, 3], 'e']),
        afterSelection: SelectionRange.from(5),
        beforeSelection: SelectionRange.from(4),
        serverRecord: {
          changeset: Changeset.parseValue([[0, 3], 'e']),
          revision: 7,
        },
      },
    ],
  });
  const client = history;

  history.pushSelectionChangeset(
    {
      changeset: Changeset.parseValue(['0', [0, 4]]),
      afterSelection: SelectionRange.from(1),
      beforeSelection: SelectionRange.from(0),
    },
    {
      type: 'merge',
    }
  );
  // 0abcde

  client.handleExternalChange({
    revision: 8,
    changeset: Changeset.parseValue([[0, 4], 'f']),
  });
  // "0abcdef"

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([0, '1', [1, 6]]),
    afterSelection: SelectionRange.from(1),
    beforeSelection: SelectionRange.from(0),
  });
  // "01abcdef"

  expect(client.view.toString()).toMatchInlineSnapshot(`"(0 -> 8)["01abcdef"]"`);
});
