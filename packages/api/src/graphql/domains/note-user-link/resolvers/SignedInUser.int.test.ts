/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apolloServer } from '../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../__tests__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__tests__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/note';
import {
  populateNotes,
  populateNotesWithText,
  userAddNote,
} from '../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import {
  NoteCategory,
  UserNoteLink,
  UserNoteLinkConnection,
} from '../../types.generated';
import { UserNoteLink_id } from '../../../../services/note/user-note-link-id';
import { objectIdToStr, strToObjectId } from '../../../../mongodb/utils/objectid';
import { Maybe } from '~utils/types';
import { Changeset } from '~collab/changeset';
import { dropAndCreateSearchIndexes } from '../../../../__tests__/helpers/mongodb/indexes';

describe('noteLink', () => {
  interface Variables {
    userId: ObjectId;
    noteId: ObjectId;
    recordsLast?: number;
  }

  const QUERY = `#graphql
    query($userId: ObjectID!, $noteId: ObjectID!, $recordsLast: PositiveInt){
      signedInUser(by: {id: $userId}) {
        noteLink(by: {id: $noteId}){
          note {
            collabText {
              headText {
                revision
                changeset
              }
              recordConnection(last: $recordsLast) {
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
    }
  `;

  let user: DBUserSchema;
  let userReadOnly: DBUserSchema;
  let note: DBNoteSchema;
  let userNoAccess: DBUserSchema;

  beforeAll(async () => {
    faker.seed(5435);
    await resetDatabase();

    user = fakeUserPopulateQueue();
    userReadOnly = fakeUserPopulateQueue();
    userNoAccess = fakeUserPopulateQueue();
    note = fakeNotePopulateQueue(user, {
      collabText: {
        recordsCount: 2,
      },
    });
    userAddNote(user, note);

    userAddNote(userReadOnly, note, {
      override: {
        readOnly: true,
        categoryName: NoteCategory.DEFAULT,
      },
    });

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
        userNoteLink: UserNoteLink;
      },
      Variables
    >(
      {
        query,
        variables,
      },
      {
        contextValue: createGraphQLResolversContext(options),
      }
    );
  }

  it('returns note', async () => {
    const response = await executeOperation(
      {
        userId: user._id,
        noteId: note._id,
        recordsLast: 2,
      },
      { user }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      signedInUser: {
        noteLink: {
          note: {
            collabText: {
              headText: {
                revision: expect.any(Number),
                changeset: expect.any(Array),
              },
              recordConnection: {
                edges: [
                  {
                    node: {
                      change: {
                        revision: expect.any(Number),
                      },
                    },
                  },
                  {
                    node: {
                      change: {
                        revision: expect.any(Number),
                      },
                    },
                  },
                ],
              },
            },
          },
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

  it('returns note users', async () => {
    const response = await executeOperation(
      {
        userId: userReadOnly._id,
        noteId: note._id,
      },
      { user: userReadOnly },
      `#graphql
      query($userId: ObjectID!, $noteId: ObjectID!) {
        signedInUser(by: {id: $userId}) {
          noteLink(by: {id: $noteId}) {
            id
            note {
              id
              users {
                user {
                  id
                  profile {
                    displayName
                  }
                }
                isOwner
              }
            }
          }
        }
      }
      `
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      signedInUser: {
        noteLink: {
          id: UserNoteLink_id(note._id, userReadOnly._id),
          note: {
            id: objectIdToStr(note._id),
            users: [
              {
                user: {
                  id: objectIdToStr(user._id),
                  profile: {
                    displayName: user.profile.displayName,
                  },
                },
                isOwner: true,
              },
              {
                user: {
                  id: objectIdToStr(userReadOnly._id),
                  profile: {
                    displayName: userReadOnly.profile.displayName,
                  },
                },
                isOwner: true,
              },
            ],
          },
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

  it('textAtRevision', async () => {
    const QUERY_TEXT_AT_REVISION = `#graphql
      query($userId: ObjectID!, $noteId: ObjectID!, $tailRevision: NonNegativeInt!) {
        signedInUser(by: {id: $userId}) {
          noteLink(by: {id: $noteId}) {
            note {
              collabText {
                textAtRevision(revision: $tailRevision) {
                  revision
                  changeset
                }
              }
            }
          }
        }
      }
    `;

    const response = await apolloServer.executeOperation<
      {
        userNoteLink: UserNoteLink;
      },
      { userId: ObjectId; noteId: ObjectId; tailRevision: number }
    >(
      {
        query: QUERY_TEXT_AT_REVISION,
        variables: {
          userId: user._id,
          noteId: note._id,
          tailRevision: 1,
        },
      },
      {
        contextValue: createGraphQLResolversContext({
          user,
        }),
      }
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toMatchInlineSnapshot(`
      {
        "signedInUser": {
          "noteLink": {
            "note": {
              "collabText": {
                "textAtRevision": {
                  "changeset": [
                    "canal fabulous",
                  ],
                  "revision": 1,
                },
              },
            },
          },
        },
      }
    `);
  });

  describe('errors', () => {
    it('throws note not found if noteId is invalid', async () => {
      const response = await executeOperation(
        {
          userId: user._id,
          noteId: new ObjectId(),
        },
        { user }
      );

      expectGraphQLResponseError(response, /note not found/i);
    });

    it('throws note not found if user is not linked to the note', async () => {
      const response = await executeOperation(
        {
          userId: userNoAccess._id,
          noteId: note._id,
        },
        { user: userNoAccess }
      );

      expectGraphQLResponseError(response, /note not found/i);
    });

    it('throws error if unknown userId', async () => {
      const response = await executeOperation({
        userId: new ObjectId(),
        noteId: note._id,
      });

      expectGraphQLResponseError(response, /must be signed in/i);
    });
  });
});

describe('noteLinkConnection', () => {
  interface Variables {
    after?: Maybe<ObjectId>;
    first?: Maybe<number>;
    before?: Maybe<ObjectId>;
    last?: Maybe<number>;
    category?: Maybe<NoteCategory>;
  }

  const QUERY = `#graphql
    query($userId: ObjectID!, $after: ObjectID, $first: NonNegativeInt, $before: ObjectID, $last: NonNegativeInt, $category: NoteCategory) {
      signedInUser(by: {id: $userId}) {
        noteLinkConnection(after: $after, first: $first, before: $before, last: $last, category: $category) {
          noteLinks {
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
    }
  `;

  const QUERY_MINIMAL = `#graphql
    query($userId: ObjectID!, $after: ObjectID, $first: NonNegativeInt, $before: ObjectID, $last: NonNegativeInt, $category: NoteCategory) {
      signedInUser(by: {id: $userId}) {
        noteLinkConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
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
        signedInUser: {
          noteLinkConnection: UserNoteLinkConnection;
        };
      },
      Variables & { userId: ObjectId }
    >(
      {
        query,
        variables: {
          ...variables,
          userId: user._id,
        },
      },
      {
        contextValue: createGraphQLResolversContext({
          user,
          ...options,
        }),
      }
    );
  }

  it('returns last 2 notes, after: 2, first 4 => 1,0 (10 notes total)', async () => {
    const response = await executeOperation({
      after: notes.at(2),
      first: 4,
    });

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      signedInUser: {
        noteLinkConnection: {
          noteLinks: notes
            .slice(0, 2)
            .reverse()
            .map((noteId) => ({
              note: {
                id: objectIdToStr(noteId),
              },
            })),
          edges: notes
            .slice(0, 2)
            .reverse()
            .map((noteId) => ({
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
      signedInUser: {
        noteLinkConnection: {
          noteLinks: [],
          edges: [],
          pageInfo: {
            hasPreviousPage: false,
            hasNextPage: false,
            startCursor: null,
            endCursor: null,
          },
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
      signedInUser: {
        noteLinkConnection: {
          noteLinks: [...notesArchive].reverse().map((noteId) => ({
            note: {
              id: objectIdToStr(noteId),
            },
          })),
          edges: [...notesArchive].reverse().map((noteId) => ({
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
      },
    });

    expect(mongoCollectionStats.allStats()).toStrictEqual(
      expect.objectContaining({
        readAndModifyCount: 1,
        readCount: 1,
      })
    );
  });

  function expectSliceInReverse(
    connection: UserNoteLinkConnection | false,
    start: number,
    end: number
  ) {
    if (!connection) return;
    expect(connection).toEqual({
      edges: notes
        .slice(start, end)
        .reverse()
        .map((noteId) => ({
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
        this.hasNextPage = data.signedInUser.noteLinkConnection.pageInfo.hasNextPage;
        this.after = strToObjectId(
          String(data.signedInUser.noteLinkConnection.pageInfo.endCursor)
        );
        return data.signedInUser.noteLinkConnection;
      },
    };

    expectSliceInReverse(await paginator.paginate(), 6, 10);
    expectSliceInReverse(await paginator.paginate(), 2, 6);
    expectSliceInReverse(await paginator.paginate(), 0, 2);
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
        this.hasPreviousPage =
          data.signedInUser.noteLinkConnection.pageInfo.hasPreviousPage;
        this.before = strToObjectId(
          String(data.signedInUser.noteLinkConnection.pageInfo.startCursor)
        );
        return data.signedInUser.noteLinkConnection;
      },
    };

    expectSliceInReverse(await paginator.paginate(), 0, 4);
    expectSliceInReverse(await paginator.paginate(), 4, 8);
    expectSliceInReverse(await paginator.paginate(), 8, 10);
  });
});

describe('noteLinkSearchConnection', () => {
  interface Variables {
    searchText: string;
    after?: string | number | null;
    before?: string | number | null;
    first?: number;
    last?: number;
  }

  const QUERY = `#graphql
    query($userId: ObjectID!, $searchText: String! $after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt) {
      signedInUser(by: {id: $userId}) {
        noteLinkSearchConnection(searchText: $searchText, after: $after, first: $first, before: $before, last: $last) {
          noteLinks {
            note {
              id
              collabText {
                headText {
                  changeset
                }
              }
            }
          }
          edges {
            node {
              note {
                id
              }
            }
            cursor
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
        }
      }
    }
  `;

  const QUERY_USER_LOOKUP = `#graphql
    query($userId: ObjectID!, $searchText: String! $after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt) {
      signedInUser(by: {id: $userId}) {
        noteLinkSearchConnection(searchText: $searchText, after: $after, first: $first, before: $before, last: $last){
          edges {
            node {
              note {
                id
                users {
                  id
                  user {
                    id
                    profile {
                      displayName
                    }
                  }
                  open {
                    closedAt
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  let populateResult: ReturnType<typeof populateNotes>;
  let user: DBUserSchema;

  beforeAll(async () => {
    faker.seed(42347);
    await resetDatabase();

    populateResult = populateNotesWithText([
      'bar bar',
      'foo foo',
      'bar',
      'foo foo foo',
      'bar bar bar',
      'foo',
    ]);

    user = populateResult.user;

    await populateExecuteAll();

    await dropAndCreateSearchIndexes();
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
        signedInUser: {
          noteLinkSearchConnection: UserNoteLinkConnection;
        };
      },
      Variables & {
        userId: ObjectId;
      }
    >(
      {
        query,
        variables: {
          ...variables,
          userId: user._id,
        },
      },
      {
        contextValue: createGraphQLResolversContext({
          user,
          ...options,
        }),
      }
    );
  }

  function getTexts(data: {
    signedInUser: { noteLinkSearchConnection: UserNoteLinkConnection };
  }) {
    return data.signedInUser.noteLinkSearchConnection.noteLinks.map((noteLink) =>
      Changeset.parseValue(noteLink.note.collabText.headText.changeset).joinInsertions()
    );
  }

  it('paginates notes from start to end', async () => {
    // [(foo foo foo),foo foo,foo]
    let response = await executeOperation({
      searchText: 'foo',
      first: 1,
    });
    let data = expectGraphQLResponseData(response);

    expect(mongoCollectionStats.allStats()).toStrictEqual(
      expect.objectContaining({
        readAndModifyCount: 1,
        readCount: 1,
      })
    );

    expect(getTexts(data)).toStrictEqual(['foo foo foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    // [foo foo foo,(foo foo),foo]
    response = await executeOperation({
      searchText: 'foo',
      first: 1,
      after: data.signedInUser.noteLinkSearchConnection.pageInfo.endCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual(['foo foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: true,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    // [foo foo foo,foo foo,(foo)]
    response = await executeOperation({
      searchText: 'foo',
      first: 1,
      after: data.signedInUser.noteLinkSearchConnection.pageInfo.endCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual(['foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: true,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    // [foo foo foo,foo foo,foo,()]
    response = await executeOperation({
      searchText: 'foo',
      first: 1,
      after: data.signedInUser.noteLinkSearchConnection.pageInfo.endCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual([]);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
  });

  it('paginates notes from end to start', async () => {
    let response = await executeOperation({
      searchText: 'foo',
      last: 1,
    });
    let data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual(['foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: true,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    response = await executeOperation({
      searchText: 'foo',
      last: 1,
      before: data.signedInUser.noteLinkSearchConnection.pageInfo.startCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual(['foo foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: true,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    response = await executeOperation({
      searchText: 'foo',
      last: 1,
      before: data.signedInUser.noteLinkSearchConnection.pageInfo.startCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual(['foo foo foo']);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    response = await executeOperation({
      searchText: 'foo',
      last: 1,
      before: data.signedInUser.noteLinkSearchConnection.pageInfo.startCursor,
    });
    data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual([]);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
  });

  it('invalid cursor returns empty array', async () => {
    const response = await executeOperation({
      searchText: 'bar',
      first: 1,
      after: 'CAIlvsvKPg==',
    });
    const data = expectGraphQLResponseData(response);

    expect(getTexts(data)).toStrictEqual([]);
    expect(data.signedInUser.noteLinkSearchConnection.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
  });

  it('queries user schema that requires lookup', async () => {
    const response = await apolloServer.executeOperation<
      {
        signedInUser: {
          noteLinkSearchConnection: UserNoteLinkConnection;
        };
      },
      Variables & {
        userId: ObjectId;
      }
    >(
      {
        query: QUERY_USER_LOOKUP,
        variables: {
          userId: user._id,
          searchText: 'foo',
          first: 1,
        },
      },
      {
        contextValue: createGraphQLResolversContext({
          user,
        }),
      }
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      signedInUser: {
        noteLinkSearchConnection: {
          edges: [
            {
              node: {
                note: {
                  id: expect.any(String),
                  users: [
                    {
                      id: expect.any(String),
                      open: null,
                      user: {
                        id: expect.any(String),
                        profile: {
                          displayName: expect.any(String),
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });
  });
});
