/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloCache, gql, NormalizedCacheObject } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, beforeEach, expect, beforeAll, describe } from 'vitest';

import { createGraphQLService } from '../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../graphql-service';
import { getCollabTextRecordId } from '../utils/id';

const Edges_CollabTextFragment = gql(`
  fragment Edges on CollabText {
    id
    recordConnection(after: $after, first: $first, before: $before, last: $last) {
      edges {
        node {
          change {
            revision
          }
        }
      }
    }
  }
`);

const PageInfo_CollabTextFragment = gql(`
    fragment PageInfo on CollabText {
      recordConnection {
        pageInfo {
          hasPreviousPage
        }
      }
    }
`);

let cache: ApolloCache<NormalizedCacheObject>;
const collabTextId = 'CollabText:1';

describe('read', () => {
  function createRecords(...revisions: number[]) {
    return revisions.map((revision) => ({
      __typename: 'CollabTextRecord',
      id: getCollabTextRecordId('1', revision),
      change: {
        __typename: 'RevisionChangeset',
        revision,
      },
    }));
  }

  beforeAll(() => {
    const serviceParams = createDefaultGraphQLServiceParams();
    serviceParams.terminatingLink = new MockLink([]);
    const service = createGraphQLService(serviceParams);
    cache = service.client.cache;

    cache.restore({
      [collabTextId]: {
        __typename: 'CollabText',
        id: '1',
        recordConnection: {
          __typename: 'CollabTextRecordConnection',
          edges: createRecords(4, 5, 6, 7, 9, 10, 11, 15, 16).map((record) => ({
            __typename: 'CollabTextRecordEdge',
            node: record,
          })),
        },
      },
    });
  });

  it('returns all records without arguments', () => {
    const collabText: any = cache.readFragment({
      id: collabTextId,
      fragment: Edges_CollabTextFragment,
    });

    expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      collabText?.recordConnection.edges.map((edge: any) => edge.node.change.revision)
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
      const collabText: any = cache.readFragment({
        id: collabTextId,
        fragment: Edges_CollabTextFragment,
        variables: {
          after,
          first,
        },
      });

      expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        collabText?.recordConnection.edges.map((edge: any) => edge.node.change.revision)
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
      const collabText: any = cache.readFragment({
        id: collabTextId,
        fragment: Edges_CollabTextFragment,
        variables: {
          before,
          last,
        },
      });

      expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        collabText?.recordConnection.edges.map((edge: any) => edge.node.change.revision)
      ).toStrictEqual(expected);
    });
  });
});

describe('merge', () => {
  beforeEach(() => {
    const serviceParams = createDefaultGraphQLServiceParams();
    serviceParams.terminatingLink = new MockLink([]);
    const service = createGraphQLService(serviceParams);
    cache = service.client.cache;

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
        fragment: PageInfo_CollabTextFragment,
        data: {
          recordConnection: {
            __typename: 'CollabTextRecordConnection',
            pageInfo: {
              hasPreviousPage: value,
            },
          },
        },
      });
    }

    function readHasPreviousPage() {
      const collabText: any = cache.readFragment({
        id: collabTextId,
        fragment: PageInfo_CollabTextFragment,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return collabText?.recordConnection.pageInfo.hasPreviousPage;
    }

    writeHasPreviousPage(true);
    expect(readHasPreviousPage()).toStrictEqual(true);
    writeHasPreviousPage(false);
    expect(readHasPreviousPage()).toStrictEqual(false);
    writeHasPreviousPage(true);
    expect(readHasPreviousPage()).toStrictEqual(false);
  });
});
