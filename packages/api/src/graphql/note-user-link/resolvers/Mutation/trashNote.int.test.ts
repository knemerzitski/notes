/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';

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
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import { NoteCategory, TrashNoteInput, TrashNotePayload } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: TrashNoteInput!){
    trashNote(input: $input) {
      deletedAt
      note {
        id
        noteId
        deletedAt
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    noteEvents {
      events {
        __typename
        ... on NoteUpdatedEvent {
          note {
            id
            categoryName
            deletedAt
          }
        }
      }
    }
  }
`;

let user: UserSchema;
let userNotOwner: UserSchema;
let userNoAccess: UserSchema;
let note: NoteSchema;
let spyDateNow: MockInstance<[], number>;

beforeAll(() => {
  spyDateNow = vi.spyOn(Date, 'now');
  spyDateNow.mockReturnValue(1);
});

afterAll(() => {
  spyDateNow.mockRestore();
});

beforeEach(async () => {
  faker.seed(68764);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userNotOwner = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user);

  userAddNote(user, note, {
    override: {
      readOnly: false,
      categoryName: NoteCategory.DEFAULT,
    },
  });
  userAddNote(userNotOwner, note, {
    override: {
      readOnly: false,
      categoryName: NoteCategory.ARCHIVE,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input?: TrashNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      trashNote: TrashNotePayload;
    },
    { input?: TrashNoteInput }
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext({
        ...options,
        override: {
          ...options?.override,
          options: {
            ...options?.override?.options,
            note: {
              trashDuration: 2,
              ...options?.override?.options?.note,
            },
          },
        },
      }),
    }
  );
}

it('user trashes note only for self', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  // Response
  expect(data).toEqual({
    trashNote: {
      deletedAt: new Date(3),
      note: {
        id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
        noteId: objectIdToStr(note._id),
        deletedAt: new Date(3),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUser = await mongoCollections.users.findOne({
    _id: user._id,
  });
  expect(dbUser).toEqual(
    expect.objectContaining({
      _id: user._id,
      notes: {
        category: {
          [NoteCategory.TRASH]: {
            order: [note._id],
          },
          [NoteCategory.DEFAULT]: {
            order: [],
          },
        },
      },
    })
  );
  const dbUserNotOwner = await mongoCollections.users.findOne({
    _id: userNotOwner._id,
  });
  expect(dbUserNotOwner).toEqual(
    expect.objectContaining({
      _id: userNotOwner._id,
      notes: {
        category: {
          [NoteCategory.ARCHIVE]: {
            order: [note._id],
          },
        },
      },
    })
  );
  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  expect(
    dbNote,
    'Note was not trashed, missing expireAt field users entry in db'
  ).toStrictEqual(
    expect.objectContaining({
      _id: note._id,
      users: expect.arrayContaining([
        expect.objectContaining({
          _id: user._id,
          categoryName: NoteCategory.TRASH,
          trashed: {
            expireAt: new Date(3),
            originalCategoryName: NoteCategory.DEFAULT,
          },
        }),
      ]),
    })
  );
});

it('returns existing trash date if note is already trashed', async () => {
  await executeOperation(
    {
      noteId: note._id,
    },
    {
      user,
    }
  );
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    {
      user,
      override: {
        options: {
          note: {
            trashDuration: 10,
          },
        },
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  // Response
  expect(data).toEqual({
    trashNote: {
      deletedAt: new Date(3),
      note: {
        id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
        noteId: objectIdToStr(note._id),
        deletedAt: new Date(3),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

  // Database, User
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(
    dbNote,
    'Note was not trashed, missing expireAt field users entry in db'
  ).toStrictEqual(
    expect.objectContaining({
      _id: note._id,
      users: expect.arrayContaining([
        expect.objectContaining({
          _id: user._id,
          categoryName: NoteCategory.TRASH,
          trashed: {
            expireAt: new Date(3),
            originalCategoryName: NoteCategory.DEFAULT,
          },
        }),
      ]),
    })
  );
});

it('uses api option trashDuration', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    {
      user,
      override: {
        options: {
          note: {
            trashDuration: 30,
          },
        },
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  // Response
  expect(data).toEqual({
    trashNote: {
      deletedAt: new Date(31),
      note: {
        id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
        noteId: objectIdToStr(note._id),
        deletedAt: new Date(31),
      },
    },
  });

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote, 'Note was not trashed, missing expireAt field in db').toStrictEqual(
    expect.objectContaining({
      _id: note._id,
      users: expect.arrayContaining([
        expect.objectContaining({
          _id: user._id,
          categoryName: NoteCategory.TRASH,
          trashed: {
            expireAt: new Date(31),
            originalCategoryName: NoteCategory.DEFAULT,
          },
        }),
      ]),
    })
  );
});

it('publishes user note trashing only for current user', async () => {
  mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
    {
      subscription: {
        query: SUBSCRIPTION,
      },
    } as Subscription,
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

  expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
    `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${objectIdToStr(userNotOwner._id)}`
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

  expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          noteEvents: {
            events: [
              {
                __typename: 'NoteUpdatedEvent',
                note: {
                  id: `${objectIdToStr(note._id)}:${objectIdToStr(userNotOwner._id)}`,
                  deletedAt: new Date(3),
                  categoryName: NoteCategory.TRASH,
                },
              },
            ],
          },
        },
      },
    }),
  });
  expect(mockSocketApi.post).toBeCalledTimes(1);
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user }
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
