import { faker } from '@faker-js/faker';
import { assert, describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../../../graphql/context';
import { UserNoteConnection, UserNoteEdge } from '../../../../graphql/types.generated';
import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserDocumentHelper from '../../../../tests/helpers/model/UserDocumentHelper';
import { Note, User, UserNote } from '../../../../tests/helpers/mongoose';

import { userNotesConnection } from './userNotesConnection';

const MAX_USER_COUNT = 3;
const TOTAL_INSERT_COUNT = 10;
const TOTAL_PAGINATE_COUNT = 3;

function rndUserNr() {
  return faker.number.int({ min: 0, max: MAX_USER_COUNT - 1 });
}

function rndNotesInsertCount() {
  return faker.number.int({ min: 2, max: 7 });
}

function rndStartIndex(arrayLength: number) {
  return faker.number.int({ min: 0, max: arrayLength - 1 });
}

function rndPaginateCount() {
  return faker.number.int({ min: 1, max: 10 });
}

const query = `#graphql
  query($first: NonNegativeInt!, $after: String){
    userNotesConnection(after: $after, first: $first){
      notes {
        ...UserNoteFields
      }
      edges {
        cursor
        node {
          ...UserNoteFields
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }

  fragment UserNoteFields on UserNote {
    id
    note {
      id
      title
      textContent
    }
    readOnly
    preferences{
      backgroundColor
    }

  }
`;

function testResolverResult(
  actual: UserNoteConnection,
  expected: UserNoteEdge[],
  expectedHasNextPage: boolean
) {
  const endEdge = expected[expected.length - 1];

  expect(actual.notes).toHaveLength(expected.length);
  expect(actual.edges).toHaveLength(expected.length);

  expect(actual.edges.map((edge) => edge.cursor)).toStrictEqual(
    expected.map((edge) => edge.cursor)
  );

  expect(actual.notes).toEqual(expected.map((edge) => ({ ...edge.node })));
  expect(actual.edges).toEqual(expected);

  expect(actual.pageInfo).toEqual({
    endCursor: endEdge?.cursor,
    hasNextPage: expectedHasNextPage,
  });
}

describe('paginate userNotesConnection', async () => {
  faker.seed(55);

  await User.deleteMany();
  await Note.deleteMany();
  await UserNote.deleteMany();

  const createNotesActions: [number, number][] = [
    ...new Array(TOTAL_INSERT_COUNT).keys(),
  ].map(() => [rndUserNr(), rndNotesInsertCount()]);

  const userHelperMap: Record<string, UserDocumentHelper> = {};
  for (const [userNr, insertCount] of createNotesActions) {
    if (!(userNr in userHelperMap)) {
      userHelperMap[userNr] = new UserDocumentHelper();
    }
    const userHelper = userHelperMap[userNr];
    assert(userHelper !== undefined);

    await userHelper.createNotes(insertCount);
  }

  const userKeyWithNoteCount = Object.keys(userHelperMap).map<[string, number]>(
    (userKey) => {
      const userHelper = userHelperMap[userKey];
      assert(userHelper !== undefined);
      const count = userHelper.noteEdges.length;
      return [userKey, count];
    }
  );

  describe.each(userKeyWithNoteCount)('user %s with %s notes', (userKey, noteCount) => {
    const userHelper = userHelperMap[userKey];
    assert(userHelper !== undefined);

    const mockedContext = mockDeep<GraphQLResolversContext>({
      auth: {
        session: {
          user: {
            _id: userHelper.user._id,
          },
        },
      },
      mongoose: {
        model: {
          User,
          UserNote,
          Note,
        },
      },
    });

    const paginateActions: [number, number][] = [
      ...new Array(TOTAL_PAGINATE_COUNT).keys(),
    ].map(() => [rndStartIndex(noteCount), rndPaginateCount()]);

    describe('directly', () => {
      it.each(paginateActions)(
        'from index %i and count %i',
        async (startIndex, count) => {
          const slicedEdges = userHelper.noteEdges.slice(startIndex, startIndex + count);

          const result = await mockResolver(userNotesConnection)(
            {},
            {
              first: count,
              after: startIndex > 0 ? userHelper.noteEdges[startIndex - 1]?.cursor : null,
            },
            mockedContext
          );

          testResolverResult(
            result,
            slicedEdges,
            startIndex + count < userHelper.noteEdges.length
          );
        }
      );
    });

    describe('graphql server', () => {
      it.each(paginateActions)(
        'from index %i and count %i',
        async (startIndex, count) => {
          const slicedEdges = userHelper.noteEdges.slice(startIndex, startIndex + count);

          const response = await apolloServer.executeOperation(
            {
              query,
              variables: {
                first: count,
                after:
                  startIndex > 0 ? userHelper.noteEdges[startIndex - 1]?.cursor : null,
              },
            },
            {
              contextValue: mockedContext,
            }
          );

          assert(response.body.kind === 'single');
          expect(response.body.singleResult.errors).toBeUndefined();

          const result = response.body.singleResult.data
            ?.userNotesConnection as UserNoteConnection;

          testResolverResult(
            result,
            slicedEdges,
            startIndex + count < userHelper.noteEdges.length
          );
        }
      );
    });
  });

  describe('graphql returns error', () => {
    const userHelper = userHelperMap[0];
    assert(userHelper !== undefined);

    const mockedContext = mockDeep<GraphQLResolversContext>({
      auth: {
        session: {
          user: {
            _id: userHelper.user._id,
          },
        },
      },
      mongoose: {
        model: {
          User,
          UserNote,
          Note,
        },
      },
    });

    // TODO test with unauthenticated context?, or instead create a common test file where all auth resolvers are tested at once
    // create it inside tests folder?

    const errorInputs: [number, string | null][] = [
      [-4, null],
      [0, null],
      [2, 'bad cursor'],
    ];

    it.each(errorInputs)('first: %i, after: %s', async (first, after) => {
      const response = await apolloServer.executeOperation(
        {
          query,
          variables: {
            first,
            after,
          },
        },
        {
          contextValue: mockedContext,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeDefined();
    });
  });
});
