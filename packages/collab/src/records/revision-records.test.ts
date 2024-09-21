import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';
import { RevisionRecords } from './revision-records';

let revisionRecords: RevisionRecords;

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

  revisionRecords = new RevisionRecords({
    tailText: {
      revision: 5,
      changeset: Changeset.fromInsertion('start'),
    },
    records: initialRecords,
  });
});

it('composes headText', () => {
  expect(revisionRecords.getHeadText().changeset.serialize()).toStrictEqual([
    'start between (parenthesis) end',
  ]);
});

it('returns headRevision', () => {
  expect(revisionRecords.headRevision).toStrictEqual(7);
});

it('returns tailRevision', () => {
  expect(revisionRecords.tailRevision).toStrictEqual(5);
});

describe('mergeToTail', () => {
  it.each([
    [0, ['start'], 5],
    [1, ['start end'], 6],
    [2, ['start between (parenthesis) end'], 7],
  ])('%s => %s at revision %i', (count, expectedTail, expectedRevision) => {
    const beforeRecordsLength = revisionRecords.items.length;
    revisionRecords.mergeToTail(count);
    expect(revisionRecords.tailText.changeset.serialize()).toStrictEqual(expectedTail);
    expect(revisionRecords.tailText.revision).toStrictEqual(expectedRevision);
    expect(revisionRecords.items.length).toStrictEqual(beforeRecordsLength - count);
  });
});
