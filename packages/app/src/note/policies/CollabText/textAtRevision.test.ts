/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ApolloCache, gql, NormalizedCacheObject } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, expect, beforeAll, describe, beforeEach } from 'vitest';

import { Changeset } from '../../../../../collab2/src';
import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';
import { getCollabTextId } from '../../utils/id';

const TextAtRevision_CollabTextFragment = gql(`
  fragment TextAtRevision_CollabTextFragment on CollabText {
    textAtRevision(revision: $revision) {
      revision
      text
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
            __typename: 'ComposedTextRecord',
            revision: 3,
            text: 'a',
          },
          {
            __typename: 'ComposedTextRecord',
            revision: 5,
            text: 'abc',
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
                revision: 4,
                changeset: Changeset.parse('1:0,"b"').serialize(),
              },
            },
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '2',
                revision: 6,
                changeset: Changeset.parse('3:0-2,"d"').serialize(),
              },
            },
            {
              __typename: 'CollabTextRecordEdge',
              node: {
                __typename: 'CollabTextRecord',
                id: '3',
                revision: 8,
                changeset: Changeset.parse('5:0-4,"f"').serialize(),
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.text).toStrictEqual('abc');
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.text).toStrictEqual('ab');
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.text).toStrictEqual('abcd');
  });

  it('returns oldest revision without arguments', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const collabText: any = cache.readFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.revision).toStrictEqual(3);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(collabText?.textAtRevision.text).toStrictEqual('a');
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
            __typename: 'ComposedTextRecord',
            revision: 20,
          },
          {
            __typename: 'ComposedTextRecord',
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
                revision: 21,
                changeset: Changeset.parse('0:"a"').serialize(),
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
          text: 'new',
        },
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).toContainEqual({
      revision: 4,
      text: 'new',
    });
  });

  it('merges with existing', () => {
    cache.writeFragment({
      id: collabTextDataId,
      fragment: TextAtRevision_CollabTextFragment,
      data: {
        textAtRevision: {
          revision: 50,
          text: 'foo must exist',
        },
      },
    });

    expect(cache.extract()[collabTextDataId]?.textAtRevision).toContainEqual({
      __typename: 'ComposedTextRecord',
      revision: 50,
      text: 'foo must exist',
      foo: 'bar',
    });
  });
});
