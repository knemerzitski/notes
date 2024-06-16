/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { InMemoryCache } from '@apollo/client';
import { it, beforeEach, assert, expect, beforeAll, describe } from 'vitest';

import { gql } from '../../../../__generated__/gql';
import { createCache } from '../../../../test/helpers/apollo-client';

let cache: InMemoryCache;
let collabTextId: string;

describe('read', () => {
  const FRAGMENT = gql(`
    fragment TestRecordsConnectionRecords on CollabText {
      recordsConnection(after: $after, first: $first, before: $before, last: $last) {
        records {
          change {
            revision
          }
        }
      }
    }
  `);

  function createRecords(...revisions: number[]) {
    return revisions.map((revision) => ({
      __typename: 'CollabTextRecord',
      id: String(revision),
      change: {
        revision,
      },
    }));
  }

  beforeAll(() => {
    cache = createCache();
    const _collabTextId = cache.identify({
      id: '1',
      __typename: 'CollabText',
    });
    collabTextId = _collabTextId!;

    cache.restore({
      [collabTextId]: {
        __typename: 'CollabText',
        id: '1',
        recordsConnection: {
          records: createRecords(4, 5, 6, 7, 9, 10, 11, 15, 16),
        },
      },
    });
  });

  it('returns all records without arguments', () => {
    const collabText = cache.readFragment({
      id: collabTextId,
      fragment: FRAGMENT,
    });

    expect(
      collabText?.recordsConnection.records.map((r) => r.change.revision)
    ).toStrictEqual([4, 5, 6, 7, 9, 10, 11, 15, 16]);
  });

  describe('records after, first', () => {
    it.each([
      [3, 1, [4]],
      [4, 3, [5, 6, 7]],
      [1, 2, undefined],
      [6, 3, undefined],
      [9, 2, [10, 11]],
      [5, undefined, [6, 7]],
      [8, undefined, [9, 10, 11]],
      [13, undefined, undefined],
    ])('%s, %s => %s', (after, first, expected) => {
      const collabText = cache.readFragment({
        id: collabTextId,
        fragment: FRAGMENT,
        variables: {
          after,
          first,
        },
      });

      expect(
        collabText?.recordsConnection.records.map((r) => r.change.revision)
      ).toStrictEqual(expected);
    });
  });

  describe('records before, last', () => {
    it.each([
      [8, 3, [5, 6, 7]],
      [10, 3, undefined],
      [9, 1, undefined],
      [12, 2, [10, 11]],
      [8, undefined, [4, 5, 6, 7]],
      [12, undefined, [9, 10, 11]],
      [4, undefined, undefined],
    ])('%s, %s => %s', (before, last, expected) => {
      const collabText = cache.readFragment({
        id: collabTextId,
        fragment: FRAGMENT,
        variables: {
          before,
          last,
        },
      });

      expect(
        collabText?.recordsConnection.records.map((r) => r.change.revision)
      ).toStrictEqual(expected);
    });
  });
});

describe('merge', () => {
  const FRAGMENT = gql(`
    fragment TestRecordsConnectionPageInfo on CollabText {
      recordsConnection {
        pageInfo {
          hasPreviousPage
        }
      }
    }
  `);

  beforeEach(() => {
    cache = createCache();
    const _collabTextId = cache.identify({
      id: '1',
      __typename: 'CollabText',
    });
    assert(_collabTextId != null);
    collabTextId = _collabTextId!;

    cache.restore({
      [collabTextId]: {
        __typename: 'CollabText',
        id: '1',
      },
    });
  });

  it('keeps hasPreviousPage false', () => {
    function writeHasPreviousPage(value: boolean) {
      cache.writeFragment({
        id: collabTextId,
        fragment: FRAGMENT,
        data: {
          recordsConnection: {
            pageInfo: {
              hasPreviousPage: value,
            },
          },
        },
      });
    }

    function readHasPreviousPage() {
      const collabText = cache.readFragment({
        id: collabTextId,
        fragment: FRAGMENT,
      });
      return collabText?.recordsConnection.pageInfo.hasPreviousPage;
    }

    writeHasPreviousPage(true);
    expect(readHasPreviousPage()).toStrictEqual(true);
    writeHasPreviousPage(false);
    expect(readHasPreviousPage()).toStrictEqual(false);
    writeHasPreviousPage(true);
    expect(readHasPreviousPage()).toStrictEqual(false);
  });
});
