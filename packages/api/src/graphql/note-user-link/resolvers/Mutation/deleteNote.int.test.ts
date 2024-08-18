/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createMockedPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseErrorMessage,
} from '../../../../__test__/helpers/graphql/response';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  DeleteNoteInput,
  DeleteNotePayload,
  NoteCategory,
} from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      note {
        id
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    noteEvents {
      events {
        __typename
        ... on NoteDeletedEvent {
          note {
            id
          }
        }
      }
    }
  }
`;

let userOldest: UserSchema;
let userNewer: UserSchema;
let userNoAccess: UserSchema;

let note: NoteSchema;
let noteSecond: NoteSchema;

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

it('older user deletes note for everyone', async () => {
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
      note: {
        id: expect.any(String),
      },
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
      note: {
        id: expect.any(String),
      },
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
  expect(dbNote, 'Newer user must not delete note').toBeDefined();
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user: userOldest }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
    });

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});

describe('subscription', () => {
  it('oldest user note deletion is published to every user involved', async () => {
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
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${userOldest._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${userNewer._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteEvents: {
              events: [
                {
                  __typename: 'NoteDeletedEvent',
                  note: {
                    id: `${note._id.toString('base64')}:${userOldest._id.toString(
                      'base64'
                    )}`,
                  },
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
            noteEvents: {
              events: [
                {
                  __typename: 'NoteDeletedEvent',
                  note: {
                    id: `${note._id.toString('base64')}:${userNewer._id.toString(
                      'base64'
                    )}`,
                  },
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });

  it('newer user note deletion is published only to self', async () => {
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

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${userNewer._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledOnce();

    expect(mockSocketApi.post).toHaveBeenLastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteEvents: {
              events: [
                {
                  __typename: 'NoteDeletedEvent',
                  note: {
                    id: `${note._id.toString('base64')}:${userNewer._id.toString(
                      'base64'
                    )}`,
                  },
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenCalledOnce();
  });
});
