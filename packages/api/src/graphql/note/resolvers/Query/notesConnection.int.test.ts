import { faker } from '@faker-js/faker';
import { assert, describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserModelHelper from '../../../../tests/helpers/model/UserModelHelper';
import { Note, User, UserNote } from '../../../../tests/helpers/mongoose';
import { GraphQLResolversContext } from '../../../context';
import { NoteConnection, NoteEdge } from '../../../types.generated';

import { notesConnection } from './notesConnection';

const USER_COUNT = 3;
const TOTAL_NOTES_COUNT = 50;
const TOTAL_PAGINATE_COUNT = 3;

function rndNotesInsertCount() {
  return faker.number.int({ min: 2, max: 7 });
}

function rndStartIndex(arrayLength: number) {
  if (faker.number.int({ min: 0, max: 10 }) <= 1) {
    return 0;
  } else {
    return faker.number.int({ min: 5, max: arrayLength - 1 });
  }
}

function rndPaginateCount() {
  return faker.number.int({ min: 5, max: 10 });
}

const query = `#graphql
  query($first: NonNegativeInt!, $after: String){
    notesConnection(after: $after, first: $first){
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

  fragment UserNoteFields on Note {
    id
    title
    textContent
    readOnly
    preferences{
      backgroundColor
    }

  }
`;

function testResolverResult(
  actual: NoteConnection,
  expected: NoteEdge[],
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

describe('paginate notesConnection', async () => {
  faker.seed(57);

  await User.deleteMany();
  await Note.deleteMany();
  await UserNote.deleteMany();

  const userModelHelper = new UserModelHelper();

  userModelHelper.createUsers(USER_COUNT);
  await userModelHelper.createNotesRandomly(TOTAL_NOTES_COUNT, rndNotesInsertCount);

  const userIndexWithNoteCount = userModelHelper.users.map<[number, number]>(
    (userHelper, index) => {
      return [index, userHelper.noteData.length];
    }
  );

  describe.each(userIndexWithNoteCount)(
    'user %s with %s notes',
    (userIndex, noteCount) => {
      const userHelper = userModelHelper.getUser(userIndex);

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
            const slicedEdges = userHelper.noteData
              .map(({ edge }) => edge)
              .slice(startIndex, startIndex + count);

            const result = await mockResolver(notesConnection)(
              {},
              {
                first: count,
                after:
                  startIndex > 0
                    ? userHelper.noteData[startIndex - 1]?.edge.cursor
                    : null,
              },
              mockedContext
            );

            testResolverResult(
              result,
              slicedEdges,
              startIndex + count < userHelper.noteData.length
            );
          }
        );
      });

      describe('graphql server', () => {
        it.each(paginateActions)(
          'from index %i and count %i',
          async (startIndex, count) => {
            const slicedEdges = userHelper.noteData
              .map(({ edge }) => edge)
              .slice(startIndex, startIndex + count);

            const response = await apolloServer.executeOperation(
              {
                query,
                variables: {
                  first: count,
                  after:
                    startIndex > 0
                      ? userHelper.noteData[startIndex - 1]?.edge.cursor
                      : null,
                },
              },
              {
                contextValue: mockedContext,
              }
            );

            assert(response.body.kind === 'single');
            expect(response.body.singleResult.errors).toBeUndefined();

            const result = response.body.singleResult.data
              ?.notesConnection as NoteConnection;

            testResolverResult(
              result,
              slicedEdges,
              startIndex + count < userHelper.noteData.length
            );
          }
        );
      });
    }
  );

  describe('graphql returns error', () => {
    const userHelper = userModelHelper.getUser(0);

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
