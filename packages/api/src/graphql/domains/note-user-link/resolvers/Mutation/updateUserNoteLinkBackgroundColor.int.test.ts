/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { Subscription } from '../../../../../../../lambda-graphql/src/dynamodb/models/subscription';

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
  resetDatabase,
  mongoCollectionStats,
} from '../../../../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { findNoteUserInSchema } from '../../../../../services/note/note';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import {
  NoteCategory,
  UpdateUserNoteLinkBackgroundColorInput,
  UpdateUserNoteLinkBackgroundColorPayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION = `#graphql
  mutation($input: UpdateUserNoteLinkBackgroundColorInput!){
    updateUserNoteLinkBackgroundColor(input: $input) {
      backgroundColor
      userNoteLink {
        id
        preferences {
          backgroundColor
        }
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on UpdateUserNoteLinkBackgroundColorPayload {
          backgroundColor
          userNoteLink {
            id
            preferences {
              backgroundColor
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

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  ({ note } = fakeNotePopulateQueue(user));

  userAddNote(user, note, {
    override: {
      readOnly: false,
      categoryName: NoteCategory.DEFAULT,
      preferences: {
        backgroundColor: '#aaaaaa',
      },
    },
  });
  userAddNote(userReadOnly, note, {
    override: {
      readOnly: true,
      categoryName: NoteCategory.DEFAULT,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Omit<UpdateUserNoteLinkBackgroundColorInput, 'note' | 'authUser'> & {
    noteId: ObjectId;
  },
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateUserNoteLinkBackgroundColor: UpdateUserNoteLinkBackgroundColorPayload;
    },
    { input?: UpdateUserNoteLinkBackgroundColorInput }
  >(
    {
      query,
      variables: {
        input: {
          note: {
            id: input.noteId,
          },
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          backgroundColor: input.backgroundColor,
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('changes backgroundColor', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      backgroundColor: '#ffffff',
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    updateUserNoteLinkBackgroundColor: {
      backgroundColor: '#ffffff',
      userNoteLink: {
        id: UserNoteLink_id(note._id, user._id),
        preferences: {
          backgroundColor: '#ffffff',
        },
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
  expect(
    dbNoteUser?.preferences?.backgroundColor,
    'Background clor was not updated in Note'
  ).toStrictEqual(dbNoteUser?.preferences?.backgroundColor);
});

it('changes backgroundColor for user with read-only access', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      backgroundColor: '#ffffff',
    },
    {
      user: userReadOnly,
    }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    updateUserNoteLinkBackgroundColor: {
      backgroundColor: '#ffffff',
      userNoteLink: {
        id: UserNoteLink_id(note._id, userReadOnly._id),
        preferences: {
          backgroundColor: '#ffffff',
        },
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  const dbNoteUser = findNoteUserInSchema(userReadOnly._id, dbNote);
  expect(
    dbNoteUser?.preferences?.backgroundColor,
    'Background color was not updated in Note'
  ).toStrictEqual('#ffffff');
});

it('makes no changes to db if backgroundColor is already correct', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      backgroundColor: '#aaaaaa',
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    updateUserNoteLinkBackgroundColor: {
      backgroundColor: '#aaaaaa',
      userNoteLink: {
        id: UserNoteLink_id(note._id, user._id),
        preferences: {
          backgroundColor: '#aaaaaa',
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

it('publishes backgroundColor only to current user', async () => {
  mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
    {
      subscription: {
        query: SUBSCRIPTION,
        variables: {
          input: {
            authUser: {
              id: user._id,
            },
          },
        } as any,
      },
    } as Subscription,
  ]);

  const response = await executeOperation(
    {
      noteId: note._id,
      backgroundColor: '#ffffff',
    },
    {
      user,
      createPublisher: createMockedPublisher,
    }
  );

  expectGraphQLResponseData(response);

  expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
    signedInUserTopic(user._id)
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

  expect(mockSocketApi.post).toHaveBeenLastCalledWith({
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          signedInUserEvents: {
            mutations: [
              {
                __typename: 'UpdateUserNoteLinkBackgroundColorPayload',
                backgroundColor: '#ffffff',
                userNoteLink: {
                  id: UserNoteLink_id(note._id, user._id),
                  preferences: {
                    backgroundColor: '#ffffff',
                  },
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
        backgroundColor: '#111111',
      },
      { user }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        backgroundColor: '#111111',
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
      backgroundColor: '#111111',
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
