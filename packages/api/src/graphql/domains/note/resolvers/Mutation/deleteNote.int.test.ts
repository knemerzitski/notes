/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  createMockedPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__test__/helpers/graphql/response';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import {
  DeleteNoteInput,
  DeleteNotePayload,
  NoteCategory,
} from '../../../types.generated';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';

const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      noteId
      userNoteLinkId
      publicUserNoteLinkId
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    signedInUserEvents {
      mutations {
        __typename
        ... on DeleteNotePayload {
          noteId
          userNoteLinkId
          publicUserNoteLinkId
        }
      }
    }
  }
`;

let userOldest: DBUserSchema;
let userNewer: DBUserSchema;
let userNoAccess: DBUserSchema;

let note: DBNoteSchema;
let noteSecond: DBNoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  userOldest = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(userOldest);
  userAddNote(userOldest, note, {
    override: {
      categoryName: NoteCategory.DEFAULT,
    },
  });

  noteSecond = fakeNotePopulateQueue(userOldest);
  userAddNote(userOldest, noteSecond, {
    override: {
      categoryName: NoteCategory.DEFAULT,
    },
  });

  userNewer = fakeUserPopulateQueue();
  userAddNote(userNewer, note, {
    override: {
      categoryName: NoteCategory.DEFAULT,
    },
  });

  userNoAccess = fakeUserPopulateQueue();

  await populateExecuteAll();
  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input?: DeleteNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      deleteNote: DeleteNotePayload;
    },
    { input?: DeleteNoteInput }
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('oldest user deletes note for everyone', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userOldest }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: objectIdToStr(note._id),
      userNoteLinkId: UserNoteLink_id(note._id, userOldest._id),
      publicUserNoteLinkId: UserNoteLink_id(note._id, userOldest._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOldest._id, userNewer._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [],
          },
        },
      },
    }),
  ]);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toBeNull();
});

it('newer user deletes note only for self', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userNewer }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: null,
      userNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
      publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOldest._id, userNewer._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [note._id, noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [],
          },
        },
      },
    }),
  ]);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toEqual(
    expect.objectContaining({
      users: [
        expect.objectContaining({
          _id: userOldest._id,
        }),
      ],
    })
  );
});

it('oldest user deletes other user note', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      userId: userNewer._id,
    },
    { user: userOldest }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: null,
      userNoteLinkId: null,
      publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOldest._id, userNewer._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [note._id, noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      notes: {
        category: {
          [NoteCategory.DEFAULT]: {
            order: [],
          },
        },
      },
    }),
  ]);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toEqual(
    expect.objectContaining({
      users: [
        expect.objectContaining({
          _id: userOldest._id,
        }),
      ],
    })
  );
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user: userOldest }
    );

    expectGraphQLResponseError(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
    });

    expectGraphQLResponseError(response, /.*must be signed in.*/);
  });
});

describe('subscription', () => {
  it('oldest user note deletion is published correctly', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as unknown as Subscription,
    ]);

    const response = await executeOperation(
      {
        noteId: note._id,
      },
      {
        user: userOldest,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOldest._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNewer._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: objectIdToStr(note._id),
                  userNoteLinkId: UserNoteLink_id(note._id, userOldest._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userOldest._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenNthCalledWith(2, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: objectIdToStr(note._id),
                  userNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });

  it('newer user note deletion is published correctly', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as unknown as Subscription,
    ]);

    const response = await executeOperation(
      {
        noteId: note._id,
      },
      {
        user: userNewer,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOldest._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNewer._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: null,
                  userNoteLinkId: null,
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenNthCalledWith(2, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: null,
                  userNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenCalledTimes(2);
  });

  it('older user deleting new user note is published correctly', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as unknown as Subscription,
    ]);

    const response = await executeOperation(
      {
        noteId: note._id,
        userId: userNewer._id,
      },
      {
        user: userOldest,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOldest._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNewer._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: null,
                  userNoteLinkId: null,
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenNthCalledWith(2, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'DeleteNotePayload',
                  noteId: null,
                  userNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNewer._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenCalledTimes(2);
  });
});
