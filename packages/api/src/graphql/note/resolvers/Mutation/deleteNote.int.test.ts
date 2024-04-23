/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { UserSchema } from '../../../../mongodb/schema/user';
import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';
import { faker } from '@faker-js/faker';
import {
  addExistingNoteToExistingUser,
  createUser,
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import {
  DeleteNoteInput,
  NoteDeletedInput,
  NoteTextField,
} from '../../../types.generated';
import { apolloServer } from '../../../../test/helpers/apollo-server';

import { createPublisher } from '~lambda-graphql/pubsub/publish';
import { typeDefs } from '../../../typeDefs.generated';
import { createGraphQlContext } from '~lambda-graphql/context/graphql';
import { mockDeep } from 'vitest-mock-extended';
import { resolvers } from '../../../resolvers.generated';

import {
  Subscription,
  SubscriptionTable,
} from '~lambda-graphql/dynamodb/models/subscription';
import { WebSocketApi } from '~lambda-graphql/context/apigateway';
import { NoteSchema } from '../../../../mongodb/schema/note';
import { CollectionName } from '../../../../mongodb/collections';
import { createUserContext } from '../../../../test/helpers/graphql-context';

const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      deleted
    }
  }
`;

let userOwner: UserSchema;
let userOther: UserSchema;
let note: NoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  const { notes: tmpNotes, user: tmpUser } = populateUserWithNotes(
    1,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 1,
        tailRevision: -1,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );

  userOwner = tmpUser;
  assert(tmpNotes[0] != null);
  note = tmpNotes[0];

  userOther = createUser();

  await populateWithCreatedData();
});

describe('delete', () => {
  it('deletes everything for note as owner', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createUserContext(userOwner),
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      deleteNote: {
        deleted: true,
      },
    });

    await expect(
      mongoCollections[CollectionName.Notes].findOne({
        publicId: note.publicId,
      }),
      'Note should be deleted'
    ).resolves.toBeNull();
  });

  it('unlinks note if not owner', async () => {
    addExistingNoteToExistingUser(userOther, note);
    await populateWithCreatedData();

    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createUserContext(userOther),
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      deleteNote: {
        deleted: true,
      },
    });

    await expect(
      mongoCollections[CollectionName.Notes].findOne({
        publicId: note.publicId,
      }),
      'Note should not be deleted'
    ).resolves.not.toBeNull();
  });

  it('throws error if user has no UserNote document', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createUserContext(userOther),
      }
    );

    assert(response.body.kind === 'single');
    const { errors } = response.body.singleResult;
    expect(errors?.length).toStrictEqual(1);
    expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Note '.+' not found/));
  });
});

describe('publish', () => {
  const mockSubscriptionsModel = mockDeep<SubscriptionTable>();
  const mockSocketApi = mockDeep<WebSocketApi>();

  const SUBSCRIPTION = `#graphql
    subscription($input: NoteDeletedInput!) {
      noteDeleted(input: $input) {
        contentId
      }
    }
  `;

  function createMockPublisher(ctx: Omit<GraphQLResolversContext, 'publish'>) {
    return createPublisher({
      context: {
        ...ctx,
        schema: createGraphQlContext({
          resolvers,
          typeDefs,
          logger: mockDeep(),
        }).schema,
        graphQLContext: mockDeep(),
        socketApi: mockSocketApi,
        logger: mockDeep(),
        models: {
          connections: mockDeep(),
          subscriptions: mockSubscriptionsModel,
        },
      },
    });
  }

  beforeEach(() => {
    mockSubscriptionsModel.queryAllByTopic.mockClear();
    mockSocketApi.post.mockClear();
  });

  it('publishes deletion of own note', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValueOnce([
      {
        subscription: {
          query: SUBSCRIPTION,
          variables: {
            input: {
              contentId: note.publicId,
            } as NoteDeletedInput,
          },
        },
      } as unknown as Subscription,
    ]);

    await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createUserContext(userOwner, createMockPublisher),
      }
    );

    expect(mockSocketApi.post.mock.lastCall).toEqual([
      {
        message: {
          type: 'next',
          payload: {
            data: {
              noteDeleted: {
                contentId: note.publicId,
              },
            },
          },
        },
      },
    ]);
  });
});
