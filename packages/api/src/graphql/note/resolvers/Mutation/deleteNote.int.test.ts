/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';

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
import {
  populateNotes,
  userAddNote,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  DeleteNoteInput,
  DeleteNotePayload,
  NoteCategory,
  NoteTextField,
} from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      id
      contentId
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    noteDeleted {
      id
      contentId
    }
  }
`;

let userOwner: UserSchema;
let userNotOwner: UserSchema;
let userNoAccess: UserSchema;

let note: NoteSchema;
let noteSecond: NoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  const populateResult = populateNotes(2, {
    collabTextKeys: Object.values(NoteTextField),
    userNote() {
      return {
        override: {
          categoryName: NoteCategory.DEFAULT,
        },
      };
    },
  });

  userOwner = populateResult.user;
  const note1 = populateResult.data[0]?.note;
  assert(note1 != null);
  note = note1;

  const note2 = populateResult.data[1]?.note;
  assert(note2 != null);
  noteSecond = note2;

  userNotOwner = fakeUserPopulateQueue();
  userAddNote(userNotOwner, note, {
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

it('note owner deletes note for everyone', async () => {
  const response = await executeOperation(
    {
      contentId: note.publicId,
    },
    { user: userOwner }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      id: expect.any(String),
      contentId: note.publicId,
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

it('note non-owner delete note only for self, note is not deleted for other users', async () => {
  const response = await executeOperation(
    {
      contentId: note.publicId,
    },
    { user: userNotOwner }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    deleteNote: {
      id: expect.any(String),
      contentId: note.publicId,
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
  expect(dbNote, 'Non-owner must not delete note').toBeDefined();
});

describe('errors', () => {
  it('throws note not found if contentId is invalid', async () => {
    const response = await executeOperation(
      {
        contentId: 'never',
      },
      { user: userOwner }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      contentId: note.publicId,
    });

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});

describe('subscription', () => {
  it('owner note deletion is published to every user involved', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as unknown as Subscription,
    ]);

    const response = await executeOperation(
      {
        contentId: note.publicId,
      },
      {
        user: userOwner,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      1,
      `${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userOwner._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenNthCalledWith(
      2,
      `${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userNotOwner._id.toString(
        'base64'
      )}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteDeleted: {
              id: `${note._id.toString('base64')}:${userOwner._id.toString('base64')}`,
              contentId: note.publicId,
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
            noteDeleted: {
              id: `${note._id.toString('base64')}:${userNotOwner._id.toString('base64')}`,
              contentId: note.publicId,
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });

  it('non-owner note deletion is published only to self', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as unknown as Subscription,
    ]);

    const response = await executeOperation(
      {
        contentId: note.publicId,
      },
      {
        user: userNotOwner,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      `${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userNotOwner._id.toString(
        'base64'
      )}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledOnce();

    expect(mockSocketApi.post).toHaveBeenLastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteDeleted: {
              id: `${note._id.toString('base64')}:${userNotOwner._id.toString('base64')}`,
              contentId: expect.any(String),
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenCalledOnce();
  });
});
