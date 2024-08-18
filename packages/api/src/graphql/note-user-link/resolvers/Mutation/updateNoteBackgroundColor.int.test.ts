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
import { findNoteUser } from '../../../../__test__/helpers/mongodb/note';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  NoteCategory,
  UpdateNoteBackgroundColorInput,
  UpdateNoteBackgroundColorPayload,
} from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: UpdateNoteBackgroundColorInput!){
    updateNoteBackgroundColor(input: $input) {
      backgroundColor
      note {
        id
        noteId
        preferences {
          backgroundColor
        }
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
            preferences {
              backgroundColor
            }
          }
        }
      }
    }
  }
`;

let user: UserSchema;
let userReadOnly: UserSchema;
let note: NoteSchema;
let userNoAccess: UserSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user);

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
  input?: UpdateNoteBackgroundColorInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateNoteBackgroundColor: UpdateNoteBackgroundColorPayload;
    },
    { input?: UpdateNoteBackgroundColorInput }
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
    updateNoteBackgroundColor: {
      backgroundColor: '#ffffff',
      note: {
        id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
        noteId: objectIdToStr(note._id),
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
  const dbNoteUser = findNoteUser(user._id, dbNote);
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
    updateNoteBackgroundColor: {
      backgroundColor: '#ffffff',
      note: {
        id: `${note._id.toString('base64')}:${userReadOnly._id.toString('base64')}`,
        noteId: objectIdToStr(note._id),
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
  const dbNoteUser = findNoteUser(userReadOnly._id, dbNote);
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
    updateNoteBackgroundColor: {
      backgroundColor: '#aaaaaa',
      note: {
        id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
        noteId: objectIdToStr(note._id),
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
    `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${user._id.toString('base64')}`
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

  expect(mockSocketApi.post).toHaveBeenLastCalledWith({
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          noteEvents: {
            events: [
              {
                __typename: 'NoteUpdatedEvent',
                note: {
                  id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
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

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        backgroundColor: '#111111',
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
      backgroundColor: '#111111',
    });

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});
