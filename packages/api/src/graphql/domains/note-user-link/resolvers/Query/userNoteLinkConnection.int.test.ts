/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import { Maybe } from '~utils/types';

import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__test__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import {
  NoteCategory,
  UserNoteLinkConnection,
} from '../../../../domains/types.generated';
import { objectIdToStr, strToObjectId } from '../../../../../mongodb/utils/objectid';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';

interface Variables {
  after?: Maybe<ObjectId>;
  first?: Maybe<number>;
  before?: Maybe<ObjectId>;
  last?: Maybe<number>;
  category?: Maybe<NoteCategory>;
}

const QUERY = `#graphql
  query($after: ObjectID, $first: NonNegativeInt, $before: ObjectID, $last: NonNegativeInt, $category: NoteCategory) {
    userNoteLinkConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
      userNoteLinks {
        note {
          id
        }
      }
      edges {
        cursor
        node {
          id
          note {
            id
            collabText {
              headText {
                revision
                changeset
              }
              recordConnection(last: 2) {
                edges {
                  node {
                    change {
                      revision
                    }
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

const QUERY_MINIMAL = `#graphql
  query($after: ObjectID, $first: NonNegativeInt, $before: ObjectID, $last: NonNegativeInt, $category: NoteCategory) {
    userNoteLinkConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
      edges {
        cursor
        node {
          note {
            id
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

let notes: ObjectId[];
let notesArchive: ObjectId[];

let user: DBUserSchema;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const populateResult = populateNotes(10, {
    collabText() {
      return {
        recordsCount: 2,
      };
    },
    noteUser() {
      return {
        override: {
          categoryName: NoteCategory.DEFAULT,
        },
      };
    },
  });
  user = populateResult.user;
  notes = populateResult.data.map((data) => data.note._id);

  const populateResultArchive = populateNotes(3, {
    user,
    noteUser() {
      return {
        override: {
          categoryName: NoteCategory.ARCHIVE,
        },
      };
    },
  });
  notesArchive = populateResultArchive.data.map((data) => data.note._id);

  await populateExecuteAll();
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

async function executeOperation(
  variables: Variables,
  options?: CreateGraphQLResolversContextOptions,
  query: string = QUERY
) {
  return await apolloServer.executeOperation<
    {
      userNoteLinkConnection: UserNoteLinkConnection;
    },
    Variables
  >(
    {
      query,
      variables,
    },
    {
      contextValue: createGraphQLResolversContext({
        user,
        ...options,
      }),
    }
  );
}

it('returns last 2 notes, after: 2, first 4 => 0,1 (10 notes total)', async () => {
  const response = await executeOperation({
    after: notes.at(2),
    first: 4,
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    userNoteLinkConnection: {
      userNoteLinks: notes.slice(0, 2).map((noteId) => ({
        note: {
          id: objectIdToStr(noteId),
        },
      })),
      edges: notes.slice(0, 2).map((noteId) => ({
        cursor: objectIdToStr(noteId),
        node: expect.objectContaining({
          id: UserNoteLink_id(noteId, user._id),
          note: expect.objectContaining({
            id: objectIdToStr(noteId),
          }),
        }),
      })),
      pageInfo: {
        hasPreviousPage: true,
        hasNextPage: false,
        startCursor: objectIdToStr(notes.at(1)!),
        endCursor: objectIdToStr(notes.at(0)!),
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

it('returns nothing when cursor does not match a note', async () => {
  const response = await executeOperation({
    after: new ObjectId(),
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    userNoteLinkConnection: {
      userNoteLinks: [],
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

it('returns notes from different archive category', async () => {
  const response = await executeOperation({
    first: 10,
    category: NoteCategory.ARCHIVE,
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    userNoteLinkConnection: {
      userNoteLinks: notesArchive.map((noteId) => ({
        note: {
          id: objectIdToStr(noteId),
        },
      })),
      edges: notesArchive.map((noteId) => ({
        cursor: objectIdToStr(noteId),
        node: expect.objectContaining({
          id: UserNoteLink_id(noteId, user._id),
          note: expect.objectContaining({
            id: objectIdToStr(noteId),
          }),
        }),
      })),
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: objectIdToStr(notesArchive.at(-1)!),
        endCursor: objectIdToStr(notesArchive.at(0)!),
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

function expectSlice(
  connection: UserNoteLinkConnection | false,
  start: number,
  end: number
) {
  if (!connection) return;
  expect(connection).toEqual({
    edges: notes.slice(start, end).map((noteId) => ({
      cursor: objectIdToStr(noteId),
      node: expect.objectContaining({
        note: {
          id: objectIdToStr(noteId),
        },
      }),
    })),
    pageInfo: expect.objectContaining({
      startCursor: objectIdToStr(notes.at(end - 1)),
      endCursor: objectIdToStr(notes.at(start)),
    }),
  });
}

it('paginates from start to end', async () => {
  const paginator = {
    first: 4,
    after: undefined as Maybe<ObjectId>,
    hasNextPage: true as Maybe<boolean>,
    async paginate() {
      if (!this.hasNextPage) return false;

      const response = await executeOperation(
        {
          after: this.after,
          first: 4,
        },
        undefined,
        QUERY_MINIMAL
      );
      const data = expectGraphQLResponseData(response);
      this.hasNextPage = data.userNoteLinkConnection.pageInfo.hasNextPage;
      this.after = strToObjectId(String(data.userNoteLinkConnection.pageInfo.endCursor));
      return data.userNoteLinkConnection;
    },
  };

  expectSlice(await paginator.paginate(), 6, 10);
  expectSlice(await paginator.paginate(), 2, 6);
  expectSlice(await paginator.paginate(), 0, 2);
});

it('paginates from end to start', async () => {
  const paginator = {
    last: 4,
    before: undefined as Maybe<ObjectId>,
    hasPreviousPage: true as Maybe<boolean>,
    async paginate() {
      if (!this.hasPreviousPage) return false;

      const response = await executeOperation(
        {
          before: this.before,
          last: 4,
        },
        undefined,
        QUERY_MINIMAL
      );
      const data = expectGraphQLResponseData(response);
      this.hasPreviousPage = data.userNoteLinkConnection.pageInfo.hasPreviousPage;
      this.before = strToObjectId(
        String(data.userNoteLinkConnection.pageInfo.startCursor)
      );
      return data.userNoteLinkConnection;
    },
  };

  expectSlice(await paginator.paginate(), 0, 4);
  expectSlice(await paginator.paginate(), 4, 8);
  expectSlice(await paginator.paginate(), 8, 10);
});
