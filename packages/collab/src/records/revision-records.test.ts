import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionRecords } from './revision-records';

describe('constructor', () => {
  it('has no records and revisions are undefined', () => {
    const records = new RevisionRecords();
    expect(records.oldestRevision).toStrictEqual(undefined);
    expect(records.newestRevision).toStrictEqual(undefined);
    expect(records.records.length).toStrictEqual(0);
  });
});

let revisionRecords: RevisionRecords;

beforeEach(() => {
  revisionRecords = new RevisionRecords({
    records: [
      {
        revision: 5,
        changset: Changeset.fromInsertion('start'),
      },
      {
        revision: 6,
      },
      {
        revision: 7,
      },
    ],
  });
});

describe('insert', () => {
  it('returns last record', () => {
    const record = {
      revision: 7,
    };
    const insertion = revisionRecords.insert(record);
    expect(revisionRecords.records[revisionRecords.records.length - 1]).toStrictEqual(
      insertion.processedRecord
    );
  });

  it('pushes change for latest revision', () => {
    const record = {
      revision: 7,
    };

    const insertion = revisionRecords.insert(record);
    expect(insertion.processedRecord.revision).toStrictEqual(8);

    expect(revisionRecords.newestRevision).toStrictEqual(8);
  });

  it('pushes change for older revision', () => {
    const record = {
      revision: 6,
    };

    const insertion = revisionRecords.insert(record);
    expect(insertion.processedRecord.revision).toStrictEqual(8);
    expect(revisionRecords.newestRevision).toStrictEqual(8);
  });

  it('throws error if inserting change that requires older not available records', () => {
    const record = {
      revision: 3,
    };
    expect(() => revisionRecords.insert(record)).toThrow();
  });

  it('throws error if inserting change that requires future revisions', () => {
    const record = {
      revision: 8,
    };
    expect(() => revisionRecords.insert(record)).toThrow();
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
    [-10, undefined],
    [-1, 7],
    [0, 5],
    [1, 6],
    [2, 7],
    [3, undefined],
    [4, undefined],
  ])('(%s,%s) => %s', (index, expectedRevision) => {
    expect(revisionRecords.indexToRevision(index)).toStrictEqual(expectedRevision);
  });
});
