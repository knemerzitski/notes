/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { gql } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { it, expect, describe } from 'vitest';

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

function text(revision: number, value: string) {
  return {
    __typename: 'ComposedTextRecord',
    revision: revision,
    text: value,
  };
}

function record(revision: number, changeset: string | null, inverse?: string) {
  return {
    __typename: 'CollabTextRecordEdge',
    node: {
      __typename: 'CollabTextRecord',
      id: String(revision),
      revision: revision,
      changeset: changeset ? Changeset.parse(changeset).serialize() : undefined,
      inverse: inverse ? Changeset.parse(inverse).serialize() : undefined,
    },
  };
}

function records(values: ReturnType<typeof record>[]) {
  return {
    __typename: 'CollabTextRecordConnection',
    edges: values,
  };
}

function create() {
  const serviceParams = createDefaultGraphQLServiceParams();
  serviceParams.terminatingLink = new MockLink([]);
  const service = createGraphQLService(serviceParams);
  const cache = service.client.cache;

  const collabTextId = getCollabTextId('1');

  const collabTextDataId = cache.identify({
    id: collabTextId,
    __typename: 'CollabText',
  })!;

  return {
    cache,
    collabTextDataId,
    restore: (collabTextFields: any) => {
      cache.restore({
        [collabTextDataId]: {
          __typename: 'CollabText',
          id: collabTextId,
          ...collabTextFields,
        },
      });
    },
  };
}

describe('read', () => {
  describe('compose from tailText', () => {
    it('at 5: 5', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(3, 'a'), text(5, 'abc')],
        recordConnection: records([
          record(4, '1:0,"b"'),
          record(6, '3:0-2,"d"'),
          record(8, '5:0-4,"f"'),
        ]),
      });

      const revision = 5;

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText.textAtRevision).toStrictEqual(text(5, 'abc'));
    });

    it('at 4: 3 * 4', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(3, 'a'), text(5, 'abc')],
        recordConnection: records([
          record(4, '1:0,"b"'),
          record(6, '3:0-2,"d"'),
          record(8, '5:0-4,"f"'),
        ]),
      });

      const revision = 4;

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText.textAtRevision).toStrictEqual(text(4, 'ab'));
    });

    it('at 6: 5 * 6', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(3, 'a'), text(5, 'abc')],
        recordConnection: records([
          record(4, '1:0,"b"'),
          record(6, '3:0-2,"d"'),
          record(8, '5:0-4,"f"'),
        ]),
      });

      const revision = 6;

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText.textAtRevision).toStrictEqual(text(6, 'abcd'));
    });

    it('returns oldest revision without arguments', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(3, 'a'), text(5, 'abc')],
        recordConnection: records([
          record(4, '1:0,"b"'),
          record(6, '3:0-2,"d"'),
          record(8, '5:0-4,"f"'),
        ]),
      });

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
      });

      expect(collabText.textAtRevision).toStrictEqual(text(3, 'a'));
    });

    describe('returns null for unreachable revisions', () => {
      it.each([2, 7, 9])('revision %s', (revision) => {
        const { cache, collabTextDataId, restore } = create();

        restore({
          textAtRevision: [text(3, 'a'), text(5, 'abc')],
          recordConnection: records([
            record(4, '1:0,"b"'),
            record(6, '3:0-2,"d"'),
            record(8, '5:0-4,"f"'),
          ]),
        });

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

  describe('compose from headText', () => {
    it('at 7: 8 * -8', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(8, 'abcdef')],
        recordConnection: records([record(7, null, '5:0-3'), record(8, null, '6:0-4')]),
      });

      const revision = 7;

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText.textAtRevision).toStrictEqual(text(7, 'abcde'));
    });

    it('at 6: 8 * -8 * -7', () => {
      const { cache, collabTextDataId, restore } = create();

      restore({
        textAtRevision: [text(8, 'abcdef')],
        recordConnection: records([record(7, null, '5:0-3'), record(8, null, '6:0-4')]),
      });

      const revision = 6;

      const collabText: any = cache.readFragment({
        id: collabTextDataId,
        fragment: TextAtRevision_CollabTextFragment,
        variables: {
          revision,
        },
      });

      expect(collabText.textAtRevision).toStrictEqual(text(6, 'abcd'));
    });
  });
});

describe('merge', () => {
  it('inserts new revision', () => {
    const { cache, collabTextDataId, restore } = create();

    restore({
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
      recordConnection: records([record(21, '0:"a"')]),
    });

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
    const { cache, collabTextDataId, restore } = create();

    restore({
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
      recordConnection: records([record(21, '0:"a"')]),
    });

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
