import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { RevisionTailRecords } from './revision-tail-records';

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
    records: initialRecords,
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
