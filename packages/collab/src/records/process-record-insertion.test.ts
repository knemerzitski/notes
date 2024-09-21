/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect } from 'vitest';
import { processRecordInsertion } from './process-record-insertion';
import { Changeset } from '../changeset';
import { ServerRevisionRecord } from './record';
import { mock } from 'vitest-mock-extended';

const records: ServerRevisionRecord[] = [
  {
    revision: 5,
    changeset: Changeset.parseValue(['b']),
    creatorUserId: '1',
    userGeneratedId: '1',
    beforeSelection: {
      start: 0,
      end: 0,
    },
    afterSelection: {
      start: 1,
      end: 1,
    },
  },
  {
    revision: 6,
    changeset: Changeset.parseValue([0, 'c']),
    creatorUserId: '1',
    userGeneratedId: '2',
    beforeSelection: {
      start: 1,
      end: 1,
    },
    afterSelection: {
      start: 2,
      end: 2,
    },
  },
  {
    revision: 7,
    changeset: Changeset.parseValue(['a', [0, 1]]),
    creatorUserId: '1',
    userGeneratedId: '3',
    beforeSelection: {
      start: 2,
      end: 2,
    },
    afterSelection: {
      start: 3,
      end: 3,
    },
  },
];

it('processes insertion on newest revision', () => {
  const insertion = processRecordInsertion({
    records,
    newRecord: {
      revision: 7,
      changeset: Changeset.parseValue([[0, 2], 'd']),
      creatorUserId: '1',
      userGeneratedId: '4',
      beforeSelection: {
        start: 3,
        end: 3,
      },
      afterSelection: {
        start: 4,
        end: 4,
      },
    },
  });
  expect(insertion).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      changeset: Changeset.parseValue([[0, 2], 'd']),
      creatorUserId: '1',
      userGeneratedId: '4',
      beforeSelection: { start: 3, end: 3 },
      afterSelection: { start: 4, end: 4 },
    },
  });
});

it('processes insertion on older revision', () => {
  const insertion = processRecordInsertion({
    records,
    newRecord: {
      revision: 5,
      changeset: Changeset.parseValue([0, '>']),
      creatorUserId: '1',
      userGeneratedId: '5',
      beforeSelection: {
        start: 1,
        end: 1,
      },
      afterSelection: {
        start: 2,
        end: 2,
      },
    },
  });
  expect(insertion).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      changeset: Changeset.parseValue([[0, 1], '>', 2]),
      creatorUserId: '1',
      userGeneratedId: '5',
      beforeSelection: { start: 2, end: 2 },
      afterSelection: { start: 3, end: 3 },
    },
  });
});

it('returns duplicate record', () => {
  const insertion = processRecordInsertion({
    records,
    newRecord: {
      revision: 5,
      changeset: Changeset.parseValue([0, 'c']),
      creatorUserId: '1',
      userGeneratedId: '2',
      beforeSelection: {
        start: 1,
        end: 1,
      },
      afterSelection: {
        start: 2,
        end: 2,
      },
    },
  });
  expect(insertion).toStrictEqual({
    type: 'duplicate',
    record: {
      revision: 6,
      changeset: Changeset.parseValue([0, 'c']),
      creatorUserId: '1',
      userGeneratedId: '2',
      beforeSelection: {
        start: 1,
        end: 1,
      },
      afterSelection: {
        start: 2,
        end: 2,
      },
    },
  });
});

it('throws error if record insertion requires older not available records', () => {
  expect(() =>
    processRecordInsertion({
      records,
      newRecord: mock<any>({
        revision: 3,
      }),
    })
  ).toThrow(
    `Missing older records to insert new record. Oldest revision: 5, Insert revision: '3'`
  );
});

it('throws error if record insertion requires non-existang future revisions', () => {
  expect(() =>
    processRecordInsertion({
      records,
      newRecord: mock<any>({
        revision: 8,
      }),
    })
  ).toThrow(
    `Cannot insert record with revision higher than newest revision. Newest revision: 7, Insert revision: 8`
  );
});
