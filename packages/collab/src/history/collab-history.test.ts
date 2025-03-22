import { expect, it } from 'vitest';

import { LocalServerRecords } from '../__tests__/helpers/server-records';
import { Changeset } from '../changeset';
import { CollabClient } from '../client/collab-client';
import { SelectionRange } from '../client/selection-range';

import { UserRecords } from '../client/user-records';

import { RevisionRecords } from '../records/revision-records';

import { CollabHistory, HistoryRecord, HistoryRecordArrayStruct } from './collab-history';

it('restores records from user records while having external change', () => {
  const userRecords = new UserRecords({
    serverRecords: new LocalServerRecords({
      records: new RevisionRecords({
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

  const client = new CollabClient({
    server: Changeset.parseValue(['abcde']),
  });
  const history = new CollabHistory({
    client,
    recordsTailText: Changeset.parseValue(['abcd']),
    serverTailRevision: 6,
    lastExecutedIndex: {
      server: 0,
      submitted: 0,
      local: 0,
    },
    serverTailTextTransformToRecordsTailText: null,
    records: [
      {
        // abcde
        changeset: Changeset.parseValue([[0, 3], 'e']),
        afterSelection: SelectionRange.from(5),
        beforeSelection: SelectionRange.from(4),
      },
    ],
  });

  // "abcdef"
  client.handleExternalChange(Changeset.parseValue([[0, 4], 'f']));
  history.restoreFromUserRecords(userRecords, 1);
});

it('undo/redo with external changes', () => {
  const client = new CollabClient();
  const history = new CollabHistory({
    client,
  });

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

  client.handleExternalChange(Changeset.parseValue(['X']));
  //Xabc
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"Xabc"`);

  client.submitChanges();
  client.submittedChangesAcknowledged();

  client.handleExternalChange(Changeset.parseValue([0, 'Y', [1, 3]]));
  //XYabc
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc"`);

  client.handleExternalChange(Changeset.parseValue([[0, 4], '2']));
  //XYabc2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabc2"`);

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([[0, 4], 'd', 5]),
    afterSelection: SelectionRange.from(6),
  });
  //XYabcd2
  expect(client.view.joinInsertions()).toMatchInlineSnapshot(`"XYabcd2"`);

  client.handleExternalChange(Changeset.parseValue([[0, 4], '1', 5]));
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

it('undo changes', () => {
  const client = new CollabClient();
  const history = new CollabHistory({
    client,
  });

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
      },
      {
        afterSelection: {
          start: 5,
        },
        beforeSelection: {
          start: 4,
        },
        changeset: [[0, 3], 'e', 4],
      },
    ],
    lastExecutedIndex: {
      local: 1,
      server: 1,
      submitted: 1,
    },
    serverTailTextTransformToRecordsTailText: [[0, 1], 'df'],
    serverTailRevision: 4,
    recordsTailText: ['abdf'],
  };

  const parsedHistory = new CollabHistory({
    ...CollabHistory.parseValue(serializedHistoryOptions),
    client: new CollabClient({
      server: Changeset.parseValue(['abcdef']),
    }),
  });

  const againSerializedHistoryOptions = parsedHistory.serialize(true);

  expect(serializedHistoryOptions).toStrictEqual(againSerializedHistoryOptions);
});

it('serializes selection correctly', () => {
  const records: HistoryRecord[] = [
    {
      changeset: Changeset.EMPTY,
      afterSelection: SelectionRange.from(1),
      beforeSelection: SelectionRange.from(0),
    },
    {
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
      },
      {
        "afterSelection": {
          "start": 2,
        },
        "changeset": [],
      },
    ]
  `);
});

it('does not merge record at serverIndex', () => {
  const client = new CollabClient({
    server: Changeset.parseValue(['abcde']),
  });
  const history = new CollabHistory({
    client,
    recordsTailText: Changeset.parseValue(['abcd']),
    serverTailRevision: 6,
    lastExecutedIndex: {
      server: 0,
      submitted: 0,
      local: 0,
    },
    serverTailTextTransformToRecordsTailText: null,
    records: [
      {
        // abcde
        changeset: Changeset.parseValue([[0, 3], 'e']),
        afterSelection: SelectionRange.from(5),
        beforeSelection: SelectionRange.from(4),
      },
    ],
  });

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

  client.handleExternalChange(Changeset.parseValue([[0, 4], 'f']));
  // "0abcdef"

  history.pushSelectionChangeset({
    changeset: Changeset.parseValue([0, '1', [1, 6]]),
    afterSelection: SelectionRange.from(1),
    beforeSelection: SelectionRange.from(0),
  });
  // "01abcdef"

  expect(client.view.toString()).toMatchInlineSnapshot(`"(0 -> 8)["01abcdef"]"`);
});
