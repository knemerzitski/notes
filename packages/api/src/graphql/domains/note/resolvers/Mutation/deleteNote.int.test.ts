/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import {
  populateExecuteAll,
  populateQueue,
} from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
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
import * as model_deleteNote from '../../../../../mongodb/models/note/delete-note';

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

let userOwner: DBUserSchema;
let userNotOwner: DBUserSchema;
let userNoAccess: DBUserSchema;

let note: DBNoteSchema;
let noteSecond: DBNoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  userOwner = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(userOwner);
  userAddNote(userOwner, note, {
    override: {
      categoryName: NoteCategory.DEFAULT,
    },
  });

  noteSecond = fakeNotePopulateQueue(userOwner);
  userAddNote(userOwner, noteSecond, {
    override: {
      categoryName: NoteCategory.DEFAULT,
    },
  });

  userNotOwner = fakeUserPopulateQueue();
  userAddNote(userNotOwner, note, {
    override: {
      isOwner: false,
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

it('only owner user deletes note for everyone', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userOwner }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: objectIdToStr(note._id),
      userNoteLinkId: UserNoteLink_id(note._id, userOwner._id),
      publicUserNoteLinkId: UserNoteLink_id(note._id, userOwner._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOwner._id, userNotOwner._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [],
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

it('other user deletes note only for self', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userNotOwner }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: null,
      userNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
      publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOwner._id, userNotOwner._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [note._id, noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [],
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
          _id: userOwner._id,
        }),
      ],
    })
  );
});

it('owner user deletes other user note', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      userId: userNotOwner._id,
    },
    { user: userOwner }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      noteId: null,
      userNoteLinkId: null,
      publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: {
        $in: [userOwner._id, userNotOwner._id],
      },
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [note._id, noteSecond._id],
          },
        },
      },
    }),
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [],
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
          _id: userOwner._id,
        }),
      ],
    })
  );
});

it('new other note user is added while note is being deleted: note user will not have dangling note reference', async () => {
  const originalDeleteNote = model_deleteNote.deleteNote;
  const spyDeleteNote = vi.spyOn(model_deleteNote, 'deleteNote');

  const newDanglingUser = fakeUserPopulateQueue({
    override: {
      profile: {
        displayName: 'user with dangling note',
      },
    },
  });
  async function addNoteUser() {
    userAddNote(newDanglingUser, note, {
      override: {
        isOwner: false,
        categoryName: NoteCategory.DEFAULT,
      },
    });
    populateQueue(() => mongoCollections.notes.replaceOne({ _id: note._id }, note));
    await populateExecuteAll();
  }

  spyDeleteNote.mockImplementationOnce((...args) => {
    return addNoteUser().then(() => originalDeleteNote(...args));
  });

  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userOwner }
  );

  expectGraphQLResponseData(response);

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(7);

  // Database, User
  const dbUsers = await mongoCollections.users
    .find({
      _id: newDanglingUser._id,
    })
    .toArray();

  expect(dbUsers).toEqual([
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [],
          },
        },
      },
    }),
  ]);
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user: userOwner }
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
  it('owner user note deletion is published correctly', async () => {
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
        user: userOwner,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOwner._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNotOwner._id)
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
                  userNoteLinkId: UserNoteLink_id(note._id, userOwner._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userOwner._id),
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
                  userNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });

  it('other user note deletion is published correctly', async () => {
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
        user: userNotOwner,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOwner._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNotOwner._id)
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
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
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
                  userNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenCalledTimes(2);
  });

  it('owner user deleting new user note is published correctly', async () => {
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
        userId: userNotOwner._id,
      },
      {
        user: userOwner,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      signedInUserTopic(userOwner._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      signedInUserTopic(userNotOwner._id)
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
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
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
                  userNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
                  publicUserNoteLinkId: UserNoteLink_id(note._id, userNotOwner._id),
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
