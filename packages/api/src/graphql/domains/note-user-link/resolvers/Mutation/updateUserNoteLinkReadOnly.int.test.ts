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
} from '../../../../../__tests__/helpers/mongodb/instance';
import { mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/mongo-collection-stats';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { findNoteUserInSchema } from '../../../../../services/note/note';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import {
  UpdateUserNoteLinkReadOnlyInput,
  UpdateUserNoteLinkReadOnlyPayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION = `#graphql
  mutation($input: UpdateUserNoteLinkReadOnlyInput!){
    updateUserNoteLinkReadOnly(input: $input) {
      readOnly
      userNoteLink {
        id
        readOnly
        user {
          id
        }
      }
      note {
        id
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on UpdateUserNoteLinkReadOnlyPayload {
          readOnly
          userNoteLink {
            id
            readOnly
            user {
              id
            }
          }
          note {
            id
          }
        }
      }
    }
  }
`;

let userOwner: DBUserSchema;
let userReadOnly: DBUserSchema;
let note: DBNoteSchema;
let userNoAccess: DBUserSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  userOwner = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  ({ note } = fakeNotePopulateQueue(userOwner));

  userAddNote(userOwner, note, {
    override: {
      readOnly: false,
    },
  });
  userAddNote(userReadOnly, note, {
    override: {
      isOwner: false,
      readOnly: true,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Omit<UpdateUserNoteLinkReadOnlyInput, 'note' | 'authUser'> & {
    noteId: ObjectId;
  },
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateUserNoteLinkReadOnly: UpdateUserNoteLinkReadOnlyPayload;
    },
    { input?: UpdateUserNoteLinkReadOnlyInput }
  >(
    {
      query,
      variables: {
        input: {
          readOnly: input.readOnly,
          userId: input.userId,
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          note: {
            id: input.noteId,
          },
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('owner user changes other user readOnly', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      userId: userReadOnly._id,
      readOnly: false,
    },
    {
      user: userOwner,
    }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    updateUserNoteLinkReadOnly: {
      readOnly: false,
      userNoteLink: {
        id: UserNoteLink_id(note._id, userReadOnly._id),
        readOnly: false,
        user: {
          id: objectIdToStr(userReadOnly._id),
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  const dbNoteUser = findNoteUserInSchema(userReadOnly._id, dbNote);
  expect(dbNoteUser?.readOnly).toStrictEqual(false);
});

it('owner user changes own readOnly', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      readOnly: true,
    },
    {
      user: userOwner,
    }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    updateUserNoteLinkReadOnly: {
      readOnly: true,
      userNoteLink: {
        id: UserNoteLink_id(note._id, userOwner._id),
        readOnly: true,
        user: {
          id: objectIdToStr(userOwner._id),
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  const dbNoteUser = findNoteUserInSchema(userOwner._id, dbNote);
  expect(dbNoteUser?.readOnly).toStrictEqual(true);
});

it('makes no changes to db if readOnly is already correct', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      readOnly: false,
    },
    {
      user: userOwner,
    }
  );

  expectGraphQLResponseData(response);

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

it('publishes readOnly correclty', async () => {
  mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
    {
      subscription: {
        query: SUBSCRIPTION,
        variables: {
          input: {
            authUser: {
              id: userOwner._id,
            },
          },
        } as any,
      },
    } as Subscription,
  ]);

  const response = await executeOperation(
    {
      noteId: note._id,
      readOnly: true,
    },
    {
      user: userOwner,
      createPublisher: createMockedPublisher,
    }
  );

  expectGraphQLResponseData(response);

  expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
    signedInUserTopic(userOwner._id)
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
    signedInUserTopic(userReadOnly._id)
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

  expect(mockSocketApi.post).toHaveBeenLastCalledWith({
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          signedInUserEvents: {
            mutations: [
              {
                __typename: 'UpdateUserNoteLinkReadOnlyPayload',
                readOnly: true,
                userNoteLink: {
                  id: UserNoteLink_id(note._id, userOwner._id),
                  readOnly: true,
                  user: {
                    id: objectIdToStr(userOwner._id),
                  },
                },
                note: {
                  id: objectIdToStr(note._id),
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

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
        readOnly: true,
      },
      { user: userOwner }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        readOnly: true,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
      readOnly: true,
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
