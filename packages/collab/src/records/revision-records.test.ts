import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionRecords } from './revision-records';

describe('constructor', () => {
  it('has no records and latestRevision is -1', () => {
    const records = new RevisionRecords();
    expect(records.headRevision).toStrictEqual(-1);
    expect(records.records.length).toStrictEqual(0);
  });
});

let revisionRecords: RevisionRecords;

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

  revisionRecords = new RevisionRecords({
    records: initialRecordsValue,
  });
});

describe('push', () => {
  it('returns last record', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };
    const returnedRecord = revisionRecords.insert(change);
    expect(revisionRecords.records[revisionRecords.records.length - 1]).toStrictEqual(
      returnedRecord
    );
  });

  it('pushes change for latest revision', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };

    const returnedRecord = revisionRecords.insert(change);
    expect(returnedRecord.revision).toStrictEqual(8);
    expect(returnedRecord.changeset.serialize()).toStrictEqual([
      [0, 4],
      ' [',
      [15, 25],
      ']',
    ]);

    expect(revisionRecords.headRevision).toStrictEqual(8);
    expect(revisionRecords.getHeadText().serialize()).toStrictEqual([
      'start [parenthesis]',
    ]);
  });

  it('pushes change for older revision', () => {
    const change = {
      revision: 6,
      changeset: Changeset.parseValue([[0, 4], '[at the same time as end was inserted]']),
    };

    const returnedRecord = revisionRecords.insert(change);
    expect(returnedRecord.revision).toStrictEqual(8);
    expect(returnedRecord.changeset.serialize()).toStrictEqual([
      [0, 27],
      '[at the same time as end was inserted]',
    ]);

    expect(revisionRecords.headRevision).toStrictEqual(8);
    expect(revisionRecords.getHeadText().serialize()).toStrictEqual([
      'start between (parenthesis) [at the same time as end was inserted]',
    ]);
  });

  it('throws error if adding change that requires older not available records', () => {
    const change = {
      revision: 3,
      changeset: Changeset.EMPTY,
    };

    expect(() => revisionRecords.insert(change)).toThrow();
  });

  it('throws error if adding change that requires future revisions', () => {
    const change = {
      revision: 8,
      changeset: Changeset.EMPTY,
    };

    expect(() => revisionRecords.insert(change)).toThrow();
  });
});

describe('sliceByRevision', () => {
  it.each([
    [6, undefined, [6, 7]],
    [5, 6, [5, 6]],
  ])('(%s,%s) => %s', (start, end, expected) => {
    expect(
      revisionRecords.sliceByRevision(start, end).map((r) => r.revision)
    ).toStrictEqual(expected);
  });
});

describe('clear', () => {
  it('clears records array and latestRevision becomes -1', () => {
    expect(revisionRecords.records).toHaveLength(3);
    expect(revisionRecords.headRevision).toStrictEqual(7);
    revisionRecords.clear();
    expect(revisionRecords.records).toHaveLength(0);
    expect(revisionRecords.headRevision).toStrictEqual(-1);
  });
});

describe('getComposed', () => {
  it('returns composed value', () => {
    expect(revisionRecords.getHeadText().serialize()).toStrictEqual([
      'start between (parenthesis) end',
    ]);
  });
});
