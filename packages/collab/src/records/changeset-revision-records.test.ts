import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { ChangesetRevisionRecords } from './changeset-revision-records';
import { RevisionRecords } from './revision-records';

let changesetRecords: ChangesetRevisionRecords;

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

  changesetRecords = new ChangesetRevisionRecords({
    tailText: {
      revision: 5,
      changeset: Changeset.fromInsertion('start'),
    },
    revisionRecords: new RevisionRecords({
      records: initialRecords,
    }),
  });
});

it('composes headText', () => {
  expect(changesetRecords.getHeadText().changeset.serialize()).toStrictEqual([
    'start between (parenthesis) end',
  ]);
});

it('returns headRevision', () => {
  expect(changesetRecords.headRevision).toStrictEqual(7);
});

it('returns tailRevision', () => {
  expect(changesetRecords.tailRevision).toStrictEqual(5);
});

describe('mergeToTail', () => {
  it.each([
    [0, ['start'], 5],
    [1, ['start end'], 6],
    [2, ['start between (parenthesis) end'], 7],
  ])('%s => %s at revision %i', (count, expectedTail, expectedRevision) => {
    const beforeRecordsLength = changesetRecords.records.length;
    changesetRecords.mergeToTail(count);
    expect(changesetRecords.tailText.changeset.serialize()).toStrictEqual(expectedTail);
    expect(changesetRecords.tailText.revision).toStrictEqual(expectedRevision);
    expect(changesetRecords.records.length).toStrictEqual(beforeRecordsLength - count);
  });
});
