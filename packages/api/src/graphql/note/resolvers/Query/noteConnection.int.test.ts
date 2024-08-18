/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../__test__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { NoteCategory, NoteConnection, NoteTextField } from '../../../types.generated';
import { UnwrapFieldWrapper } from '../../../../__test__/helpers/graphql/field-wrap';
import { Maybe } from '~utils/types';

interface Variables {
  after?: string;
  first?: number;
  before?: string;
  last?: number;
  category?: NoteCategory;
}

const QUERY = `#graphql
  query($after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt, $category: NoteCategory) {
    noteConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
      notes {
        noteId
      }
      edges {
        cursor
        node {
          id
          noteId
          textFields {
            key
            value {
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
  query($after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt, $category: NoteCategory) {
    noteConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
      edges {
        cursor
        node {
          noteId
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

let user: UserSchema;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const populateResult = populateNotes(10, {
    collabTextKeys: Object.values(NoteTextField),
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
    collabTextKeys: Object.values(NoteTextField),
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
      noteConnection: UnwrapFieldWrapper<NoteConnection>;
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

it('returns last 2 notes, after: 7, first 4 => 8,9 (10 notes total)', async () => {
  const response = await executeOperation({
    after: objectIdToStr(notes.at(7)),
    first: 4,
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    noteConnection: {
      notes: notes.slice(8, 10).map((noteId) => ({
        noteId: objectIdToStr(noteId),
      })),
      edges: notes.slice(8, 10).map((noteId) => ({
        cursor: objectIdToStr(noteId),
        node: expect.objectContaining({
          noteId: objectIdToStr(noteId),
        }),
      })),
      pageInfo: {
        hasPreviousPage: true,
        hasNextPage: false,
        startCursor: objectIdToStr(notes.at(8)),
        endCursor: objectIdToStr(notes.at(9)),
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

it('returns nothing when cursor is invalid (db is not queried)', async () => {
  const response = await executeOperation({
    after: 'never',
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    noteConnection: {
      notes: [],
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(0);
});

it('returns nothing when cursor does not match a note', async () => {
  const response = await executeOperation({
    after: objectIdToStr(new ObjectId()),
  });

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    noteConnection: {
      notes: [],
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
    noteConnection: {
      notes: notesArchive.map((noteId) => ({
        noteId: objectIdToStr(noteId),
      })),
      edges: notesArchive.map((noteId) => ({
        cursor: objectIdToStr(noteId),
        node: expect.objectContaining({
          noteId: objectIdToStr(noteId),
        }),
      })),
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: objectIdToStr(notesArchive.at(0)),
        endCursor: objectIdToStr(notesArchive.at(-1)),
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
  noteConnection: UnwrapFieldWrapper<NoteConnection> | false,
  start: number,
  end: number
) {
  if (!noteConnection) return;
  expect(noteConnection).toEqual({
    edges: notes.slice(start, end).map((noteId) => ({
      cursor: objectIdToStr(noteId),
      node: expect.objectContaining({
        noteId: objectIdToStr(noteId),
      }),
    })),
    pageInfo: expect.objectContaining({
      startCursor: objectIdToStr(notes.at(start)),
      endCursor: objectIdToStr(notes.at(end - 1)),
    }),
  });
}

it('paginates from start to end', async () => {
  const paginator = {
    first: 4,
    after: undefined as string | number | undefined | null,
    hasNextPage: true as Maybe<boolean>,
    async paginate() {
      if (!this.hasNextPage) return false;

      const response = await executeOperation(
        {
          after: this.after ? String(this.after) : undefined,
          first: 4,
        },
        undefined,
        QUERY_MINIMAL
      );
      const data = expectGraphQLResponseData(response);
      this.hasNextPage = data.noteConnection.pageInfo?.hasNextPage;
      this.after = data.noteConnection.pageInfo?.endCursor;
      return data.noteConnection;
    },
  };

  expectSlice(await paginator.paginate(), 0, 4);
  expectSlice(await paginator.paginate(), 4, 8);
  expectSlice(await paginator.paginate(), 8, 10);
});

it('paginates from end to start', async () => {
  const paginator = {
    last: 4,
    before: undefined as string | number | undefined | null,
    hasPreviousPage: true as Maybe<boolean>,
    async paginate() {
      if (!this.hasPreviousPage) return false;

      const response = await executeOperation(
        {
          before: this.before ? String(this.before) : undefined,
          last: 4,
        },
        undefined,
        QUERY_MINIMAL
      );
      const data = expectGraphQLResponseData(response);
      this.hasPreviousPage = data.noteConnection.pageInfo?.hasPreviousPage;
      this.before = data.noteConnection.pageInfo?.startCursor;
      return data.noteConnection;
    },
  };

  expectSlice(await paginator.paginate(), 6, 10);
  expectSlice(await paginator.paginate(), 2, 6);
  expectSlice(await paginator.paginate(), 0, 2);
});
