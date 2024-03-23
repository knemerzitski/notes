import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from './changeset';
import { ChangesetRevisionRecords } from './changeset-revision-records';

describe('ChangesetRevisionRecords', () => {
  describe('constructor', () => {
    it('has no records and latestRevision -1', () => {
      const records = new ChangesetRevisionRecords();
      expect(records.latestRevision).toStrictEqual(-1);
      expect(records.records.length).toStrictEqual(0);
    });
  });

  let composition: ChangesetRevisionRecords;

  beforeEach(() => {
    const initialRecordsValue = [
      {
        revision: 5,
        changeset: Changeset.fromInsertion('start'),
      },
      {
        revision: 6,
        changeset: Changeset.parseValue([[0, 4], ' end']),
      },
      {
        revision: 7,
        changeset: Changeset.parseValue([[0, 4], ' between (parenthesis) ', [6, 8]]),
      },
    ];

    composition = new ChangesetRevisionRecords({
      latestRevision: 7,
      records: initialRecordsValue,
    });
  });

  describe('push', () => {
    it('returns last record', () => {
      const change = {
        revision: 7,
        changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
      };
      const returnedRecord = composition.push(change);
      expect(composition.records[composition.records.length - 1]).toStrictEqual(
        returnedRecord
      );
    });

    it('pushes change for latest revision', () => {
      const change = {
        revision: 7,
        changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
      };

      const returnedRecord = composition.push(change);
      expect(returnedRecord.revision).toStrictEqual(8);
      expect(returnedRecord.changeset.serialize()).toStrictEqual([
        [0, 4],
        ' [',
        [15, 25],
        ']',
      ]);

      expect(composition.latestRevision).toStrictEqual(8);
      expect(composition.getComposed().serialize()).toStrictEqual([
        'start [parenthesis]',
      ]);
    });

    it('pushes change for older revision', () => {
      const change = {
        revision: 6,
        changeset: Changeset.parseValue([
          [0, 4],
          '[at the same time as end was inserted]',
        ]),
      };

      const returnedRecord = composition.push(change);
      expect(returnedRecord.revision).toStrictEqual(8);
      expect(returnedRecord.changeset.serialize()).toStrictEqual([
        [0, 27],
        '[at the same time as end was inserted]',
      ]);

      expect(composition.latestRevision).toStrictEqual(8);
      expect(composition.getComposed().serialize()).toStrictEqual([
        'start between (parenthesis) [at the same time as end was inserted]',
      ]);
    });

    it('throws error if adding change that requires older not available records', () => {
      const change = {
        revision: 3,
        changeset: Changeset.EMPTY,
      };

      expect(() => composition.push(change)).toThrow();
    });

    it('throws error if adding change that requires future revisions', () => {
      const change = {
        revision: 8,
        changeset: Changeset.EMPTY,
      };

      expect(() => composition.push(change)).toThrow();
    });
  });

  describe('clear', () => {
    it('clears records array and keeps latestRevision value', () => {
      expect(composition.records).toHaveLength(3);
      expect(composition.latestRevision).toStrictEqual(7);
      composition.clear();
      expect(composition.records).toHaveLength(0);
      expect(composition.latestRevision).toStrictEqual(7);
    });
  });

  describe('getComposed', () => {
    it('returns composed value', () => {
      expect(composition.getComposed().serialize()).toStrictEqual([
        'start between (parenthesis) end',
      ]);
    });
  });
});
