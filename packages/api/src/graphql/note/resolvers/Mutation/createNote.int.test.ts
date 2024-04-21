/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';
import NotesDataSource from '../../datasource/notes-datasource';
import { faker } from '@faker-js/faker';
import {
  createUser,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { CreateNoteInput, NoteTextField } from '../../../types.generated';
import { apolloServer } from '../../../../test/helpers/apollo-server';

import { Publisher, createPublisher } from '~lambda-graphql/pubsub/publish';
import { typeDefs } from '../../../typeDefs.generated';
import { createGraphQlContext } from '~lambda-graphql/context/graphql';
import { mockDeep } from 'vitest-mock-extended';
import { resolvers } from '../../../resolvers.generated';

import {
  Subscription,
  SubscriptionTable,
} from '~lambda-graphql/dynamodb/models/subscription';
import { WebSocketApi } from '~lambda-graphql/context/apigateway';

const MUTATION = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      note {
        id
        noteId
        textFields {
          key
          value {
            headText {
              revision
              changeset
            }
            recordsConnection(first: 1) {
              records {
                creatorUserId
                change {
                  revision
                }
              }
            }
          }
        }
      }
    }
  }
`;

const createNoteInput: CreateNoteInput = {
  note: {
    textFields: [
      {
        key: NoteTextField.CONTENT,
        value: {
          initialText: 'initial note text',
        },
      },
      {
        key: NoteTextField.TITLE,
        value: {
          initialText: 'foo title',
        },
      },
    ],
  },
};

function createUserContext(
  user: UserSchema,
  publisher = (_ctx: Omit<GraphQLResolversContext, 'publish'>) => vi.fn() as Publisher
): GraphQLResolversContext {
  const ctx = {
    auth: {
      session: {
        user: {
          _id: user._id,
        },
      },
    },
    datasources: {
      notes: new NotesDataSource({
        mongodb: {
          collections: mongoCollections,
        },
      }),
    },
    mongodb: {
      collections: mongoCollections,
      client: mongoClient,
    },
  } as Omit<GraphQLResolversContext, 'publish'>;

  return {
    ...ctx,
    publish: publisher(ctx),
  };
}

let user: UserSchema;

beforeAll(async () => {
  faker.seed(778);
  await resetDatabase();

  user = createUser();
  await populateWithCreatedData();
});

describe('create', () => {
  let contextValue: GraphQLResolversContext;

  beforeAll(() => {
    contextValue = createUserContext(user);
  });

  it('creates a new note with initial text', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: createNoteInput,
        },
      },
      {
        contextValue,
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      createNote: {
        note: {
          id: expect.any(String),
          noteId: expect.any(String),
          textFields: [
            {
              key: 'CONTENT',
              value: {
                headText: {
                  revision: expect.any(Number),
                  changeset: ['initial note text'],
                },
                recordsConnection: {
                  records: [
                    {
                      creatorUserId: expect.any(String),
                      change: {
                        revision: expect.any(Number),
                      },
                    },
                  ],
                },
              },
            },
            {
              key: 'TITLE',
              value: {
                headText: {
                  revision: expect.any(Number),
                  changeset: ['foo title'],
                },
                recordsConnection: {
                  records: [
                    {
                      creatorUserId: expect.any(String),
                      change: {
                        revision: expect.any(Number),
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });
  });
});

describe('publish', () => {
  let contextValue: GraphQLResolversContext;

  const mockSubscriptionsModel = mockDeep<SubscriptionTable>();
  const mockSocketApi = mockDeep<WebSocketApi>();

  const SUBSCRIPTION = `#graphql
    subscription {
      noteCreated {
        note {
          noteId
          textFields {
            key
            value {
              headText {
                changeset
              }
            }
          }
        }
      }
    }
  `;

  beforeAll(() => {
    contextValue = createUserContext(user, (ctx) => {
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
    });
  });

  beforeEach(() => {
    mockSubscriptionsModel.queryAllByTopic.mockClear();
    mockSocketApi.post.mockClear();
  });

  it('publishes created note to a subscription', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValueOnce([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as Subscription,
    ]);

    await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: createNoteInput,
        },
      },
      {
        contextValue,
      }
    );

    expect(mockSocketApi.post.mock.lastCall).toEqual([
      {
        message: {
          type: 'next',
          payload: {
            data: {
              noteCreated: {
                note: {
                  noteId: expect.any(String),
                  textFields: [
                    {
                      key: 'CONTENT',
                      value: {
                        headText: { changeset: ['initial note text'] },
                      },
                    },
                    {
                      key: 'TITLE',
                      value: { headText: { changeset: ['foo title'] } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ]);
  });
});
