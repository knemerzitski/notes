/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createMockedPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__tests__/helpers/graphql/response';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import {
  NoteCategory,
  TrashUserNoteLinkInput,
  TrashUserNoteLinkPayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION = `#graphql
  mutation($input: TrashUserNoteLinkInput!){
    trashUserNoteLink(input: $input) {
      deletedAt
      userNoteLink {
        id
        deletedAt
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on TrashUserNoteLinkPayload {
          deletedAt
          userNoteLink {
            id
            deletedAt
            categoryName
          }
        }
      }
    }
  }
`;

let user: DBUserSchema;
let userNotOwner: DBUserSchema;
let userNoAccess: DBUserSchema;
let note: DBNoteSchema;
let spyDateNow: MockInstance<() => number>;

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
  input: Omit<TrashUserNoteLinkInput, 'authUser' | 'note'> & {
    noteId: ObjectId
  },
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      trashUserNoteLink: TrashUserNoteLinkPayload;
    },
    { input?: TrashUserNoteLinkInput }
  >(
    {
      query,
      variables: {
        input: {
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          note: {
            id: input.noteId
          }
        },
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
    trashUserNoteLink: {
      deletedAt: new Date(3),
      userNoteLink: {
        id: UserNoteLink_id(note._id, user._id),
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
      note: {
        categories: {
          [NoteCategory.TRASH]: {
            noteIds: [note._id],
          },
          [NoteCategory.DEFAULT]: {
            noteIds: [],
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
      note: {
        categories: {
          [NoteCategory.ARCHIVE]: {
            noteIds: [note._id],
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
    trashUserNoteLink: {
      deletedAt: new Date(3),
      userNoteLink: {
        id: UserNoteLink_id(note._id, user._id),
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
    trashUserNoteLink: {
      deletedAt: new Date(31),
      userNoteLink: {
        id: UserNoteLink_id(note._id, user._id),
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
        variables: {
          input: {
            authUser: {
              id: userNotOwner._id,
            },
          },
        } as any,
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
    signedInUserTopic(userNotOwner._id)
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

  expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          signedInUserEvents: {
            mutations: [
              {
                __typename: 'TrashUserNoteLinkPayload',
                deletedAt: new Date(3),
                userNoteLink: {
                  id: UserNoteLink_id(note._id, userNotOwner._id),
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

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
