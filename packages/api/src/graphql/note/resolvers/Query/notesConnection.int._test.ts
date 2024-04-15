import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { DeepMockProxy, mockDeep } from 'vitest-mock-extended';

import { apolloServer } from '../../../../test/helpers/apollo-server';
import UserDocumentHelper from '../../../../test/helpers/mongodb/_model/UserDocumentHelper';
import UserModelHelper from '../../../../test/helpers/mongodb/_model/UserModelHelper';
import { Note, User, UserNote, resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';
import { NoteConnection, NoteEdge } from '../../../types.generated';

const query = `#graphql
  query($last: NonNegativeInt, $before: String, $first: NonNegativeInt, $after: String){
    notesConnection(last: $last, before: $before, after: $after, first: $first){
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
        startCursor
        hasPreviousPage
        endCursor
        hasNextPage
      }
    }
  }

  fragment UserNoteFields on Note {
    id
    title
    content {
      revision
      text
    }
    readOnly
    preferences {
      backgroundColor
    }
  }
`;

function testNoteConnectionExpectedToActual(
  actualConnection: NoteConnection,
  expectedEdges: NoteEdge[],
  expectedHasPrevPage: boolean,
  expectedHasNextPage: boolean,
  customCursor: string | null = null
) {
  const startEdge = expectedEdges[0];
  const endEdge = expectedEdges[expectedEdges.length - 1];

  expect(actualConnection.notes).toHaveLength(expectedEdges.length);
  expect(actualConnection.edges).toHaveLength(expectedEdges.length);

  expect(actualConnection.edges.map((edge) => edge.cursor)).toStrictEqual(
    expectedEdges.map((edge) => edge.cursor)
  );

  expect(actualConnection.notes).toEqual(expectedEdges.map((edge) => ({ ...edge.node })));
  expect(actualConnection.edges).toEqual(expectedEdges);

  expect(actualConnection.pageInfo).toEqual({
    startCursor: startEdge?.cursor ?? customCursor,
    hasPreviousPage: expectedHasPrevPage,
    endCursor: endEdge?.cursor ?? customCursor,
    hasNextPage: expectedHasNextPage,
  });
}

function createUserGraphQLContext(userHelper: UserDocumentHelper) {
  return mockDeep<GraphQLResolversContext>({
    auth: {
      session: {
        user: {
          _id: userHelper.user._id.toString('base64'),
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
}

describe.skip('notesConnection', () => {
  return;
  faker.seed(4325);

  describe('no notes', async () => {
    await resetDatabase();

    const userModelHelper = new UserModelHelper();
    const userHelper = userModelHelper.getOrCreateUser(0);

    const mockedContext = createUserGraphQLContext(userHelper);

    it('first returns []', async () => {
      const response = await apolloServer.executeOperation(
        {
          query,
          variables: {
            first: 5,
          },
        },
        {
          contextValue: mockedContext,
        }
      );

      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeUndefined();

      const result = response.body.singleResult.data?.notesConnection as NoteConnection;

      testNoteConnectionExpectedToActual(result, [], false, false);
    });
  });

  describe('with notes', async () => {
    await resetDatabase();

    const userModelHelper = new UserModelHelper();

    userModelHelper.createUsers(3);
    await userModelHelper.createNotesRandomly(
      {
        0: 15,
        1: 12,
        2: 25,
      },
      () => faker.number.int({ min: 2, max: 7 })
    );

    const userHelper = userModelHelper.getUser(1);

    const mockedContext = createUserGraphQLContext(userHelper);

    describe('forwards (first, after)', () => {
      it('[|0,1,2,3|,4,5,6,7,8,9,10,11] first page', async () => {
        const expectedEdges = userHelper.noteData.slice(0, 4).map(({ edge }) => edge);
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 4,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,>3,|4,5,6,7|,8,9,10,11] middle page', async () => {
        const expectedEdges = userHelper.noteData.slice(4, 8).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[3]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 4,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,4,5,6,>7,|8,9,10,11|] last page', async () => {
        const expectedEdges = userHelper.noteData.slice(8, 12).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[7]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 4,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,4,5,6,7,>8,|9,10,11],_,_| handles first overflowing last element', async () => {
        const expectedEdges = userHelper.noteData.slice(9, 12).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[8]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 5,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,4,5,6,7,8,9,10,>11|],_,_,_,_| returns [] after last element', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = false;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[11]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 4,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,4,>5,6,7,8,9,10,11] cursor at middle, first 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = true;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[5]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 0,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('[>0,1,2,3,4,5,6,7,8,9,10,11] cursor at start, first 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[0]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 0,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('[0,1,2,3,4,5,6,7,8,9,10,>11] cursor at last, first 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[11]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 0,
              after: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('limits first to 20', async () => {
        const userHelper = userModelHelper.getUser(2);

        const mockedContext = createUserGraphQLContext(userHelper);

        const expectedEdges = userHelper.noteData.slice(0, 20).map(({ edge }) => edge);
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 25,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });
    });

    describe('backwards (last, before)', () => {
      it('[0,1,2,3,4,5,6,7,|8,9,10,11|] last page', async () => {
        const expectedEdges = userHelper.noteData.slice(8, 12).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 4,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,|4,5,6,7|,>8,9,10,11] middle page', async () => {
        const expectedEdges = userHelper.noteData.slice(4, 8).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[8]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 4,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[|0,1,2,3|,>4,5,6,7,8,9,10,11] first page', async () => {
        const expectedEdges = userHelper.noteData.slice(0, 4).map(({ edge }) => edge);
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[4]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 4,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('|_,_,[0,1,2|,>3,4,5,6,7,8,9,10,11] handles last overflowing first element', async () => {
        const expectedEdges = userHelper.noteData.slice(0, 3).map(({ edge }) => edge);
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[3]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 5,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('|_,_,_,_,[|>0,1,2,3,4,5,6,7,8,9,10,11] returns [] before first element', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = false;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[0]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 4,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        console.log(response.body.singleResult.errors);
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });

      it('[0,1,2,3,4,>5,6,7,8,9,10,11] cursor at middle, last 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = true;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[5]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 0,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('[>0,1,2,3,4,5,6,7,8,9,10,11] cursor at start, last 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = false;
        const expectedHasNextPage = true;

        const cursor = userHelper.noteData[0]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 0,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('[0,1,2,3,4,5,6,7,8,9,10,>11] cursor at last, last 0, returns [] and pageinfo ', async () => {
        const expectedEdges: NoteEdge[] = [];
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const cursor = userHelper.noteData[11]?.edge.cursor;
        assert(cursor !== undefined);

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 0,
              before: cursor,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage,
          cursor
        );
      });

      it('limits last to 20', async () => {
        const userHelper = userModelHelper.getUser(2);

        const mockedContext = createUserGraphQLContext(userHelper);

        const expectedEdges = userHelper.noteData.slice(5, 25).map(({ edge }) => edge);
        const expectedHasPrevPage = true;
        const expectedHasNextPage = false;

        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              last: 25,
            },
          },
          {
            contextValue: mockedContext,
          }
        );
        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeUndefined();

        const result = response.body.singleResult.data?.notesConnection as NoteConnection;

        testNoteConnectionExpectedToActual(
          result,
          expectedEdges,
          expectedHasPrevPage,
          expectedHasNextPage
        );
      });
    });

    describe('error', () => {
      it('unauthenticated', async () => {
        const response = await apolloServer.executeOperation(
          {
            query,
            variables: {
              first: 4,
            },
          },
          {
            contextValue: mockDeep<GraphQLResolversContext>({
              mongoose: {
                model: {
                  User,
                  UserNote,
                  Note,
                },
              },
            }),
          }
        );

        assert(response.body.kind === 'single');
        expect(response.body.singleResult.errors).toBeDefined();
      });

      describe('variables', () => {
        it.each([
          {},
          { first: 5, last: 5 },
          {
            before: userHelper.noteData[1]?.edge.cursor,
            after: userHelper.noteData[0]?.edge.cursor,
          },
          {
            first: 5,
            before: userHelper.noteData[1]?.edge.cursor,
          },
          {
            last: 5,
            after: userHelper.noteData[0]?.edge.cursor,
          },
          {
            first: -1,
          },
          {
            last: -1,
          },
          {
            after: 'invalid',
          },
          {
            before: 'invalid',
          },
          {
            first: 0,
          },
          {
            last: 0,
          },
        ])('%s', async (variables) => {
          const response = await apolloServer.executeOperation(
            {
              query,
              variables,
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
  });

  describe('orphaned db state', () => {
    let userModelHelper: UserModelHelper;
    let userHelper: UserDocumentHelper;

    let mockedContext: DeepMockProxy<GraphQLResolversContext>;

    beforeEach(async () => {
      await resetDatabase();

      userModelHelper = new UserModelHelper();

      userModelHelper.createUsers(1);

      userHelper = userModelHelper.getUser(0);

      mockedContext = createUserGraphQLContext(userHelper);
    });

    it('no usernote: entry is skipped', async () => {
      await userHelper.createNotes(3);
      await UserNote.findByIdAndDelete(userHelper.noteData[1]?.userNote._id);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expectedEdges = [userHelper.noteData[0]!, userHelper.noteData[2]!].map(
        ({ edge }) => edge
      );
      const expectedHasPrevPage = false;
      const expectedHasNextPage = false;

      const response = await apolloServer.executeOperation(
        {
          query,
          variables: {
            first: 4,
          },
        },
        {
          contextValue: mockedContext,
        }
      );
      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeUndefined();

      const result = response.body.singleResult.data?.notesConnection as NoteConnection;

      testNoteConnectionExpectedToActual(
        result,
        expectedEdges,
        expectedHasPrevPage,
        expectedHasNextPage
      );
    });

    it('no note: entry is skipped', async () => {
      await userHelper.createNotes(3);
      await Note.findByIdAndDelete(userHelper.noteData[1]?.note._id);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expectedEdges = [userHelper.noteData[0]!, userHelper.noteData[2]!].map(
        ({ edge }) => edge
      );
      const expectedHasPrevPage = false;
      const expectedHasNextPage = false;

      const response = await apolloServer.executeOperation(
        {
          query,
          variables: {
            first: 4,
          },
        },
        {
          contextValue: mockedContext,
        }
      );
      assert(response.body.kind === 'single');
      expect(response.body.singleResult.errors).toBeUndefined();

      const result = response.body.singleResult.data?.notesConnection as NoteConnection;

      testNoteConnectionExpectedToActual(
        result,
        expectedEdges,
        expectedHasPrevPage,
        expectedHasNextPage
      );
    });
  });
});
