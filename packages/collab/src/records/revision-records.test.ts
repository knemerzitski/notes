import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionRecords } from './revision-records';

describe('constructor', () => {
  it('has no records and latestRevision is -1', () => {
    const records = new RevisionRecords();
    expect(records.endRevision).toStrictEqual(-1);
    expect(records.records.length).toStrictEqual(0);
  });
});

let revisionRecords: RevisionRecords;

function composedRecords() {
  return revisionRecords.records.reduce(
    (a, b) => a.compose(b.changeset),
    Changeset.EMPTY
  );
}

beforeEach(() => {
  revisionRecords = new RevisionRecords({
    records: [
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
    ],
  });
});

describe('insert', () => {
  it('returns last record', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };
    const insertion = revisionRecords.insert(change);
    expect(revisionRecords.records[revisionRecords.records.length - 1]).toStrictEqual(
      insertion.processedRecord
    );
  });

  it('pushes change for latest revision', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };

    const insertion = revisionRecords.insert(change);
    expect(insertion.processedRecord.revision).toStrictEqual(8);
    expect(insertion.processedRecord.changeset.serialize()).toStrictEqual([
      [0, 4],
      ' [',
      [15, 25],
      ']',
    ]);

    expect(revisionRecords.endRevision).toStrictEqual(8);
    expect(composedRecords().serialize()).toStrictEqual(['start [parenthesis]']);
  });

  it('pushes change for older revision', () => {
    const change = {
      revision: 6,
      changeset: Changeset.parseValue([[0, 4], '[at the same time as end was inserted]']),
    };

    const insertion = revisionRecords.insert(change);
    expect(insertion.processedRecord.revision).toStrictEqual(8);
    expect(insertion.processedRecord.changeset.serialize()).toStrictEqual([
      [0, 27],
      '[at the same time as end was inserted]',
    ]);

    expect(revisionRecords.endRevision).toStrictEqual(8);
    expect(composedRecords().serialize()).toStrictEqual([
      'start between (parenthesis) [at the same time as end was inserted]',
    ]);
  });

  it('throws error if inserting change that requires older not available records', () => {
    const change = {
      revision: 3,
      changeset: Changeset.EMPTY,
    };

    expect(() => revisionRecords.insert(change)).toThrow();
  });

  it('throws error if inserting change that requires future revisions', () => {
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
    expect(revisionRecords.endRevision).toStrictEqual(7);
    revisionRecords.clear();
    expect(revisionRecords.records).toHaveLength(0);
    expect(revisionRecords.endRevision).toStrictEqual(-1);
  });
});

describe('revisionToIndex', () => {
  it.each([
    [4, -1],
    [5, 0],
    [6, 1],
    [7, 2],
    [8, -1],
  ])('%s => %s', (revision, index) => {
    expect(revisionRecords.revisionToIndex(revision)).toStrictEqual(index);
  });
});

describe('indexToRevision', () => {
  it.each([
    [-10, -1],
    [-1, 7],
    [0, 5],
    [1, 6],
    [2, 7],
    [3, -1],
    [4, -1],
  ])('(%s,%s) => %s', (index, expectedRevision) => {
    expect(revisionRecords.indexToRevision(index)).toStrictEqual(expectedRevision);
  });
});