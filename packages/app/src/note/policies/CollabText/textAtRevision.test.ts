/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ApolloCache, gql, NormalizedCacheObject } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, expect, beforeAll, describe, beforeEach } from 'vitest';

import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';
import { getCollabTextId } from '../../utils/id';

const TextAtRevision_CollabTextFragment = gql(`
  fragment TextAtRevision_CollabTextFragment on CollabText {
    textAtRevision(revision: $revision) {
      revision
      changeset
    }
  }
`);

let cache: ApolloCache<NormalizedCacheObject>;

const noteId = '1';
let collabTextDataId: string;

describe('read', () => {
  beforeAll(() => {
    const serviceParams = createDefaultGraphQLServiceParams();
    serviceParams.terminatingLink = new MockLink([]);
    const service = createGraphQLService(serviceParams);
    cache = service.client.cache;

    collabTextDataId = cache.identify({
      id: getCollabTextId(noteId),
      __typename: 'CollabText',
    })!;

    /*
    3 - a
    4 - ab
    5 - abc
    6 - abcd
    8 - abcdef
    */
    cache.restore({
      [collabTextDataId]: {
        __typename: 'CollabText',
        id: '1',
        textAtRevision: [
          {
            __typename: 'RevisionChangeset',
            revision: 3,
            changeset: ['a'],
          },
          {
            __typename: 'RevisionChangeset',
            revision: 5,
            changeset: ['abc'],
          },
        ],
        recordConnection: {
          __typename: 'CollabTextRecordConnection',
          edges: [
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '1',
                change: {
                  __typename: 'RevisionChangeset',
                  revision: 4,
                  changeset: [0, 'b'],
                },
              },
            },
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '2',
                change: {
                  __typename: 'RevisionChangeset',
                  revision: 6,
                  changeset: [[0, 2], 'd'],
                },
              },
            },
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '3',
                change: {
                  __typename: 'RevisionChangeset',
                  revision: 8,
                  changeset: [[0, 4], 'f'],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('returns exact textAtRevision: 5', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 5,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.revision).toStrictEqual(5);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['abc']);
  });

  it('composes text from records: 3 * 4', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 4,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.revision).toStrictEqual(4);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['ab']);
  });

  it('composes text from records: 5 * 6', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 6,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.revision).toStrictEqual(6);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['abcd']);
  });

  it('returns oldest revision without arguments', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.revision).toStrictEqual(3);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['a']);
  });

  describe('returns null for unreachable revisions', () => {
    it.each([2, 7, 9])('revision %s', (revision) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText).toBeNull();
    });
  });
});

describe('merge', () => {
  beforeEach(() => {
    const serviceParams = createDefaultGraphQLServiceParams();
    serviceParams.terminatingLink = new MockLink([]);
    const service = createGraphQLService(serviceParams);
    cache = service.client.cache;

    collabTextDataId = cache.identify({
      id: getCollabTextId(noteId),
      __typename: 'CollabText',
    })!;

    cache.restore({
      [collabTextDataId]: {
        __typename: 'CollabText',
        id: '1',
        textAtRevision: [
          {
            __typename: 'RevisionChangeset',
            revision: 20,
          },
          {
            __typename: 'RevisionChangeset',
            revision: 50,
            foo: 'bar',
          },
        ],
        recordConnection: {
          __typename: 'CollabTextRecordConnection',
          edges: [
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '1',
                change: {
                  __typename: 'RevisionChangeset',
                  revision: 21,
                  changeset: ['a'],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('inserts new revision', () => {
    cache.writeFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      data: {
        textAtRevision: {
          revision: 4,
          changeset: ['new'],
        },
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).toContainEqual({
      revision: 4,
      changeset: ['new'],
    });
  });

  it('merges with existing', () => {
    cache.writeFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      data: {
        textAtRevision: {
          revision: 50,
          changeset: ['foo must exist'],
        },
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).toContainEqual({
      __typename: 'RevisionChangeset',
      revision: 50,
      changeset: ['foo must exist'],
      foo: 'bar',
    });
  });
});
