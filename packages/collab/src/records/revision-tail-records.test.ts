import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionTailRecords } from './revision-tail-records';
import { ServerRevisionRecord } from './record';

let revisionText: RevisionTailRecords;

beforeEach(() => {
  const initialRecords = [
    {
      revision: 6,
      changeset: Changeset.parseValue([[0, 4], ' end']),
    },
    {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' between (parenthesis) ', [6, 8]]),
    },
  ];

  revisionText = new RevisionTailRecords({
    tailText: {
      revision: 5,
      changeset: Changeset.fromInsertion('start'),
    },
    records: {
      records: initialRecords,
    },
    serializeRecord: (r) => ({ ...r, changeset: r.changeset.serialize() }),
  });
});

it('composes headText', () => {
  expect(revisionText.getHeadText().changeset.serialize()).toStrictEqual([
    'start between (parenthesis) end',
  ]);
});

it('returns headRevision', () => {
  expect(revisionText.headRevision).toStrictEqual(7);
});

it('returns tailRevision', () => {
  expect(revisionText.tailRevision).toStrictEqual(5);
});

it('returns startRevision from records', () => {
  expect(revisionText.startRevision).toStrictEqual(6);
});

describe('mergeToTail', () => {
  it.each([
    [0, ['start'], 5],
    [1, ['start end'], 6],
    [2, ['start between (parenthesis) end'], 7],
  ])('%s => %s at revision %i', (count, expectedTail, expectedRevision) => {
    const beforeRecordsLength = revisionText.records.length;
    revisionText.mergeToTail(count);
    expect(revisionText.tailText.changeset.serialize()).toStrictEqual(expectedTail);
    expect(revisionText.tailText.revision).toStrictEqual(expectedRevision);
    expect(revisionText.records.length).toStrictEqual(beforeRecordsLength - count);
  });
});

describe('update', () => {
  function createConsecutiveRecords(start: number, end: number) {
    return [...new Array<undefined>(end - start + 1)].map((_, i) => ({
      revision: start + i,
      changeset: Changeset.fromInsertion(String(start + i)),
    }));
  }

  let revisionRecords: RevisionTailRecords;

  beforeEach(() => {
    revisionRecords = new RevisionTailRecords({
      records: {
        records: createConsecutiveRecords(5, 8),
      },
      tailText: {
        revision: 4,
        changeset: Changeset.fromInsertion('4'),
      },
      serializeRecord: (r) => ({ ...r, changeset: r.changeset.serialize() }),
    });
  });

  it.each([
    [1, 2, 4, 1, [2, 3, 4, 5, 6, 7, 8]],
    [6, 7, 10, 4, [5, 6, 7, 8, 9, 10]],
    [50, 7, 10, 4, [5, 6, 7, 8, 9, 10]],
  ])(
    '(%s,%s,%s) => %s, %s',
    (tailRevision, start, end, expectedTailRevision, expectedRecordRevisions) => {
      revisionRecords.update(createConsecutiveRecords(start, end), {
        revision: tailRevision,
        changeset: Changeset.fromInsertion(String(tailRevision)),
      });
      expect(revisionRecords.records.map((r) => r.revision)).toStrictEqual(
        expectedRecordRevisions
      );
      expect(revisionRecords.tailRevision).toStrictEqual(expectedTailRevision);
    }
  );

  it.each([[2, 7, 10]])('(%s,%s,%s) => throws error', (tailRevision, start, end) => {
    expect(() => {
      revisionRecords.update(createConsecutiveRecords(start, end), {
        revision: tailRevision,
        changeset: Changeset.fromInsertion(String(tailRevision)),
      });
    }).toThrow();
  });
});
