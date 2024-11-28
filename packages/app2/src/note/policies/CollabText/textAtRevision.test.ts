/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloCache, gql, NormalizedCacheObject } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, expect, beforeAll, describe, beforeEach } from 'vitest';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';
import { createGraphQLService } from '../../../graphql/create/service';
import { Changeset } from '~collab/changeset';

const TextAtRevision_CollabTextFragment = gql(`
  fragment TestTextAtRevision on CollabText {
    textAtRevision(revision: $revision) {
      revision
      changeset
    }
  }
`);

let cache: ApolloCache<NormalizedCacheObject>;
let collabTextDataId: string;
const collabTextId = '1';

describe('read', () => {
  beforeAll(() => {
    const serviceParams = createDefaultGraphQLServiceParams();
    serviceParams.terminatingLink = new MockLink([]);
    const service = createGraphQLService(serviceParams);
    cache = service.client.cache;

    collabTextDataId = cache.identify({
      id: collabTextId,
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
            // TODO fix scalar not invoked
            changeset: Changeset.parseValue(['a']),
          },
          {
            __typename: 'RevisionChangeset',
            revision: 5,
            // TODO fix scalar not invoked
            changeset: Changeset.parseValue(['abc']),
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
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 5,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(5);
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['abc']);
  });

  it('composes text from records: 3 * 4', () => {
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 4,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(4);
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['ab']);
  });

  it('composes text from records: 5 * 6', () => {
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      variables: {
        revision: 6,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(6);
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['abcd']);
  });

  it('returns oldest revision without arguments', () => {
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(3);
    expect(collabText?.textAtRevision.changeset.serialize()).toStrictEqual(['a']);
  });

  describe('returns null for unreachable revisions', () => {
    it.each([2, 7, 9])('revision %s', (revision) => {
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

// TODO update tests
describe.skip('merge', () => {
  beforeEach(() => {
    cache = createCache();
    const _collabTextRef = cache.identify({
      id: collabTextId,
      __typename: 'CollabText',
    });
    collabTextDataId = _collabTextRef!;

    cache.restore({
      [collabTextDataId]: {
        __typename: 'CollabText',
        id: '1',
        textAtRevision: [
          {
            revision: 20,
          },
          {
            revision: 50,
            foo: 'bar',
          },
        ],
        recordsConnection: {
          records: [
            {
              __typename: 'CollabTextRecord',
              id: '1',
              change: {
                revision: 21,
                changeset: ['a'],
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
      fragment: FRAGMENT,
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
      fragment: FRAGMENT,
      data: {
        textAtRevision: {
          revision: 50,
          changeset: ['foo must exist'],
        },
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).toContainEqual({
      revision: 50,
      changeset: ['foo must exist'],
      foo: 'bar',
    });
  });

  it('ignores revision if it can be calculated from records', () => {
    cache.writeFragment({
      id: collabTextDataId,
      fragment: FRAGMENT,
      data: {
        textAtRevision: {
          revision: 21,
          changeset: ['ignored'],
        },
      },
      variables: {
        // Passing id by variable is required since readField cannot return id
        collabTextId,
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).not.toContainEqual({
      revision: 21,
      changeset: ['ignored'],
    });
  });
});
