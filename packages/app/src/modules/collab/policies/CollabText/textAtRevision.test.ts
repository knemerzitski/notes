/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { InMemoryCache } from '@apollo/client';
import { it, expect, beforeAll, describe, beforeEach } from 'vitest';

import { gql } from '../../../../__generated__/gql';
import { createCache } from '../../../../__test__/helpers/apollo-client';

const FRAGMENT = gql(`
  fragment TestTextAtRevision on CollabText {
    textAtRevision(revision: $revision) {
      revision
      changeset
    }
  }
`);

let cache: InMemoryCache;
let collabTextRef: string;
const collabTextId = 1;

describe('read', () => {
  beforeAll(() => {
    cache = createCache();
    const _collabTextId = cache.identify({
      id: collabTextId,
      __typename: 'CollabText',
    });
    collabTextRef = _collabTextId!;

    /*
    3 - a
    4 - ab
    5 - abc
    6 - abcd
    8 - abcdef
    */
    cache.restore({
      [collabTextRef]: {
        __typename: 'CollabText',
        id: '1',
        textAtRevision: [
          {
            revision: 3,
            changeset: ['a'],
          },
          {
            revision: 5,
            changeset: ['abc'],
          },
        ],
        recordsConnection: {
          records: [
            {
              __typename: 'CollabTextRecord',
              id: '1',
              change: {
                revision: 4,
                changeset: [0, 'b'],
              },
            },
            {
              __typename: 'CollabTextRecord',
              id: '2',
              change: {
                revision: 6,
                changeset: [[0, 2], 'd'],
              },
            },
            {
              __typename: 'CollabTextRecord',
              id: '3',
              change: {
                revision: 8,
                changeset: [[0, 4], 'f'],
              },
            },
          ],
        },
      },
    });
  });

  it('returns exact textAtRevision: 5', () => {
    const collabText = cache.readFragment({
      id: collabTextRef,
      fragment: FRAGMENT,
      variables: {
        revision: 5,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(5);
    expect(collabText?.textAtRevision.changeset).toStrictEqual(['abc']);
  });

  it('composes text from records: 3 * 4', () => {
    const collabText = cache.readFragment({
      id: collabTextRef,
      fragment: FRAGMENT,
      variables: {
        revision: 4,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(4);
    expect(collabText?.textAtRevision.changeset).toStrictEqual(['ab']);
  });

  it('composes text from records: 5 * 6', () => {
    const collabText = cache.readFragment({
      id: collabTextRef,
      fragment: FRAGMENT,
      variables: {
        revision: 6,
      },
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(6);
    expect(collabText?.textAtRevision.changeset).toStrictEqual(['abcd']);
  });

  it('returns oldest revision without arguments', () => {
    const collabText = cache.readFragment({
      id: collabTextRef,
      fragment: FRAGMENT,
    });

    expect(collabText?.textAtRevision.revision).toStrictEqual(3);
    expect(collabText?.textAtRevision.changeset).toStrictEqual(['a']);
  });

  describe('returns null for unreachable revisions', () => {
    it.each([2, 7, 9])('revision %s', (revision) => {
      const collabText = cache.readFragment({
        id: collabTextRef,
        fragment: FRAGMENT,
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
    cache = createCache();
    const _collabTextRef = cache.identify({
      id: collabTextId,
      __typename: 'CollabText',
    });
    collabTextRef = _collabTextRef!;

    cache.restore({
      [collabTextRef]: {
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
      id: collabTextRef,
      fragment: FRAGMENT,
      data: {
        textAtRevision: {
          revision: 4,
          changeset: ['new'],
        },
      },
    });

    expect(cache.extract()[collabTextRef]?.textAtRevision).toContainEqual({
      revision: 4,
      changeset: ['new'],
    });
  });

  it('merges with existing', () => {
    cache.writeFragment({
      id: collabTextRef,
      fragment: FRAGMENT,
      data: {
        textAtRevision: {
          revision: 50,
          changeset: ['foo must exist'],
        },
      },
    });

    expect(cache.extract()[collabTextRef]?.textAtRevision).toContainEqual({
      revision: 50,
      changeset: ['foo must exist'],
      foo: 'bar',
    });
  });

  it('ignores revision if it can be calculated from records', () => {
    cache.writeFragment({
      id: collabTextRef,
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

    expect(cache.extract()[collabTextRef]?.textAtRevision).not.toContainEqual({
      revision: 21,
      changeset: ['ignored'],
    });
  });
});
