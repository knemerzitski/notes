import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';

import { RevisionArray } from './revision-array';

describe('constructor', () => {
  it('has no items and revisions are undefined', () => {
    const arr = new RevisionArray();
    expect(arr.oldestRevision).toStrictEqual(undefined);
    expect(arr.newestRevision).toStrictEqual(undefined);
    expect(arr.length).toStrictEqual(0);
  });
});

let revisionArray: RevisionArray;

beforeEach(() => {
  revisionArray = new RevisionArray([
    {
      revision: 5,
      changeset: Changeset.fromInsertion('start'),
    },
    {
      revision: 6,
    },
    {
      revision: 7,
    },
  ]);
});

describe('revisionToIndex', () => {
  it.each([
    [4, -1],
    [5, 0],
    [6, 1],
    [7, 2],
    [8, -1],
  ])('%s => %s', (revision, index) => {
    expect(revisionArray.revisionToIndex(revision)).toStrictEqual(index);
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
    expect(revisionArray.indexToRevision(index)).toStrictEqual(expectedRevision);
  });
});
