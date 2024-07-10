/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, describe, expect, it } from 'vitest';

import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { UserSchema } from '../../../../mongodb/schema/user';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import {
  createPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../test/helpers/graphql-context';
import { resetDatabase } from '../../../../test/helpers/mongodb';
import {
  createUser,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { GraphQLResolversContext } from '../../../context';
import { CreateNoteInput, NoteTextField } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      note {
        id
        contentId
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
    contextValue = createGraphQLResolversContext(user);
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
          contentId: expect.any(String),
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

  const SUBSCRIPTION = `#graphql
    subscription {
      noteCreated {
        note {
          contentId
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
    contextValue = createGraphQLResolversContext(user, {
      createPublisher,
    });
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
                  contentId: expect.any(String),
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
