/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { UserSchema } from '../../../../mongodb/schema/user';
import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';
import { faker } from '@faker-js/faker';
import {
  populateNoteToUser,
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import {
  NoteTextField,
  NoteUpdatedInput,
  UpdateNoteInput,
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
import { createUserContext } from '../../../../test/helpers/graphql-context';

import { Changeset } from '~collab/changeset/changeset';
import { CollectionName } from '../../../../mongodb/collections';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { ObjectId } from 'mongodb';

const MUTATION = `#graphql
  mutation($input: UpdateNoteInput!){
    updateNote(input: $input) {
      contentId
      patch {
        textFields {
          key
          value {
            newRecord {
              id
              creatorUserId
              change {
                revision
                changeset
              }
              beforeSelection {
                start
                end
              }
              afterSelection {
                start
                end
              }
            }
            isExistingRecord
          }
        }
        preferences {
          backgroundColor
        }
      }
    }
  }
`;

let user: UserSchema;
let note: NoteSchema;
let readOnlyNote: NoteSchema;
let readOnlyUserNote: UserNoteSchema;

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  const { notes: tmpNotes, user: tmpUser } = populateUserWithNotes(
    1,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 4,
        tailRevision: 10,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
      userNote: {
        readOnly: false,
      },
    }
  );

  user = tmpUser;
  assert(tmpNotes[0] != null);
  note = tmpNotes[0];

  const { note: tmpReadOnlyNote, userNote: tmpReadOnlyUserNote } = populateNoteToUser(
    user,
    Object.values(NoteTextField),
    {
      collabText: {
        tailRevision: 10,
        recordsCount: 4,
      },
      userNote: {
        readOnly: true,
      },
    }
  );

  readOnlyNote = tmpReadOnlyNote;
  readOnlyUserNote = tmpReadOnlyUserNote;

  await populateWithCreatedData();
});

describe('update', () => {
  it('returns error note not found on invalid contentId', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: '[none]',
            patch: {},
          } as UpdateNoteInput,
        },
      },
      {
        contextValue: createUserContext(user),
      }
    );

    assert(response.body.kind === 'single');
    const { errors } = response.body.singleResult;
    expect(errors?.length).toStrictEqual(1);
    expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Note '.+' not found/));
  });

  it('returns error note read-only if attempting to change textFields', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: readOnlyNote.publicId,
            patch: {
              textFields: [
                {
                  key: NoteTextField.CONTENT,
                  value: {
                    insertRecord: {
                      generatedId: 'ab',
                      change: {
                        revision: 14,
                        changeset: Changeset.parseValue(['never']),
                      },
                      afterSelection: {
                        start: 9,
                      },
                      beforeSelection: {
                        start: 0,
                      },
                    },
                  },
                },
              ],
            },
          } as UpdateNoteInput,
        },
      },
      {
        contextValue: createUserContext(user),
      }
    );

    assert(response.body.kind === 'single');
    const { errors } = response.body.singleResult;
    expect(errors?.length).toStrictEqual(1);
    expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Note is read-only.*/));
  });

  it('allows changing read-only note preferences', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: readOnlyNote.publicId,
            patch: {
              textFields: [],
              preferences: {
                backgroundColor: '#00000f',
              },
            },
          } as UpdateNoteInput,
        },
      },
      {
        contextValue: createUserContext(user),
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      updateNote: {
        contentId: readOnlyNote.publicId,
        patch: {
          preferences: {
            backgroundColor: '#00000f',
          },
          textFields: [],
        },
      },
    });

    await expect(
      mongoCollections[CollectionName.UserNotes].findOne(
        {
          _id: readOnlyUserNote._id,
        },
        {
          projection: {
            _id: 0,
            bg: '$preferences.backgroundColor',
          },
        }
      )
    ).resolves.toStrictEqual({
      bg: '#00000f',
    });
  });

  describe('insertRecord', () => {
    it('inserts to headText', async () => {
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'aa',
                        change: {
                          revision: 14,
                          changeset: Changeset.parseValue([[0, 3], '. after head']),
                        },
                        beforeSelection: {
                          start: 4,
                        },
                        afterSelection: {
                          start: 16,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user),
        }
      );

      // Response
      assert(response.body.kind === 'single');
      const { data, errors } = response.body.singleResult;
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        updateNote: {
          contentId: expect.any(String),
          patch: {
            textFields: [
              {
                key: 'CONTENT',
                value: {
                  newRecord: {
                    id: expect.any(String),
                    creatorUserId: expect.any(String),
                    change: {
                      revision: 15,
                      changeset: [[0, 3], '. after head'],
                    },
                    beforeSelection: {
                      start: 4,
                      end: null,
                    },
                    afterSelection: {
                      start: 16,
                      end: null,
                    },
                  },
                  isExistingRecord: false,
                },
              },
            ],
            preferences: {
              backgroundColor: null,
            },
          },
        },
      });

      // Database
      const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
      assert(collabTextId != null);
      await expect(
        mongoCollections[CollectionName.CollabTexts].findOne(
          {
            _id: collabTextId,
          },
          {
            projection: {
              _id: 0,
              record: {
                $last: '$records',
              },
            },
          }
        )
      ).resolves.toEqual({
        record: {
          userGeneratedId: 'aa',
          creatorUserId: expect.any(ObjectId),
          revision: 15,
          changeset: [[0, 3], '. after head'],
          beforeSelection: {
            start: 4,
          },
          afterSelection: {
            start: 16,
          },
        },
      });
    });

    it('inserts to older revision but not older than tailText', async () => {
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'aa',
                        change: {
                          revision: 12,
                          changeset: Changeset.parseValue(['text before "r_12"', [0, 3]]),
                        },
                        beforeSelection: {
                          start: 0,
                        },
                        afterSelection: {
                          start: 18,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user),
        }
      );

      // Response
      assert(response.body.kind === 'single');
      const { data, errors } = response.body.singleResult;
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        updateNote: {
          contentId: expect.any(String),
          patch: {
            textFields: [
              {
                key: 'CONTENT',
                value: {
                  newRecord: {
                    id: expect.any(String),
                    creatorUserId: expect.any(String),
                    change: {
                      revision: 15,
                      changeset: [[0, 3], 'text before "r_12"'],
                    },
                    beforeSelection: {
                      start: 0,
                      end: null,
                    },
                    afterSelection: {
                      start: 22,
                      end: null,
                    },
                  },
                  isExistingRecord: false,
                },
              },
            ],
            preferences: {
              backgroundColor: null,
            },
          },
        },
      });

      // Database
      const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
      assert(collabTextId != null);
      await expect(
        mongoCollections[CollectionName.CollabTexts].findOne(
          {
            _id: collabTextId,
          },
          {
            projection: {
              _id: 0,
              record: {
                $last: '$records',
              },
            },
          }
        )
      ).resolves.toEqual({
        record: {
          userGeneratedId: 'aa',
          creatorUserId: expect.any(ObjectId),
          revision: 15,
          changeset: [[0, 3], 'text before "r_12"'],
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 22,
          },
        },
      });
    });

    it('returns error when revision is older than tailText', async () => {
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'aa',
                        change: {
                          revision: 9, // tailText is 10
                          changeset: Changeset.EMPTY,
                        },
                        beforeSelection: {
                          start: 0,
                        },
                        afterSelection: {
                          start: 18,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user),
        }
      );

      assert(response.body.kind === 'single');
      const { errors } = response.body.singleResult;
      expect(errors?.length).toStrictEqual(1);
      expect(errors?.[0]?.message).toEqual(
        expect.stringMatching(/Revision is too old.*/)
      );
    });

    it('returns error when revision is newer than headText', async () => {
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'aa',
                        change: {
                          revision: 15, // headText is 14
                          changeset: Changeset.EMPTY,
                        },
                        beforeSelection: {
                          start: 0,
                        },
                        afterSelection: {
                          start: 18,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user),
        }
      );

      assert(response.body.kind === 'single');
      const { errors } = response.body.singleResult;
      expect(errors?.length).toStrictEqual(1);
      expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Invalid revision.*/));
    });

    it('returns error when changeset cannot be composed to headText', async () => {
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'aa',
                        change: {
                          revision: 14,
                          changeset: Changeset.parseValue([
                            [0, 10],
                            ' too many retained characters',
                          ]),
                        },
                        beforeSelection: {
                          start: 0,
                        },
                        afterSelection: {
                          start: 0,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user),
        }
      );

      assert(response.body.kind === 'single');
      const { errors } = response.body.singleResult;
      expect(errors?.length).toStrictEqual(1);
      expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Invalid changeset.*/));
    });

    it('returns existing record when inserting record with same generatedId', async () => {
      const variables = {
        input: {
          contentId: note.publicId,
          patch: {
            textFields: [
              {
                key: NoteTextField.CONTENT,
                value: {
                  insertRecord: {
                    generatedId: 'will_be_duplicate',
                    change: {
                      revision: 14,
                      changeset: Changeset.parseValue([[0, 3], '. after head']),
                    },
                    beforeSelection: {
                      start: 4,
                    },
                    afterSelection: {
                      start: 16,
                    },
                  },
                },
              },
            ],
          },
        } as UpdateNoteInput,
      };

      await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables,
        },
        {
          contextValue: createUserContext(user),
        }
      );
      const response = await apolloServer.executeOperation(
        {
          query: MUTATION,
          variables,
        },
        {
          contextValue: createUserContext(user),
        }
      );

      // Response
      assert(response.body.kind === 'single');
      const { data, errors } = response.body.singleResult;
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        updateNote: {
          contentId: expect.any(String),
          patch: {
            textFields: [
              {
                key: 'CONTENT',
                value: {
                  newRecord: {
                    id: expect.any(String),
                    creatorUserId: expect.any(String),
                    change: {
                      revision: 15,
                      changeset: [[0, 3], '. after head'],
                    },
                    beforeSelection: {
                      start: 4,
                      end: null,
                    },
                    afterSelection: {
                      start: 16,
                      end: null,
                    },
                  },
                  isExistingRecord: true,
                },
              },
            ],
            preferences: {
              backgroundColor: null,
            },
          },
        },
      });
    });
  });
});

describe.only('publish', () => {
  const mockSubscriptionsModel = mockDeep<SubscriptionTable>();
  const mockSocketApi = mockDeep<WebSocketApi>();

  const SUBSCRIPTION = `#graphql
    subscription($input: NoteUpdatedInput!) {
      noteUpdated(input: $input) {
        contentId
        patch {
          textFields {
            key
             value {
              newRecord {
                change {
                  revision
                  changeset
                }
              }
             }
          }
        }
      }
    }
  `;

  // TODO create mock publisher as helper?
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

  it('publishes new record insertion', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValueOnce([
      {
        subscription: {
          query: SUBSCRIPTION,
          variables: {
            input: {
              contentId: note.publicId,
            } as NoteUpdatedInput,
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
            patch: {
              textFields: [
                {
                  key: NoteTextField.CONTENT,
                  value: {
                    insertRecord: {
                      generatedId: 'in-subscription',
                      change: {
                        revision: 14,
                        changeset: Changeset.parseValue([
                          [0, 3],
                          '. after head. published',
                        ]),
                      },
                      beforeSelection: {
                        start: 4,
                      },
                      afterSelection: {
                        start: 26,
                      },
                    },
                  },
                },
              ],
            },
          } as UpdateNoteInput,
        },
      },
      {
        contextValue: createUserContext(user, createMockPublisher),
      }
    );

    expect(mockSocketApi.post.mock.lastCall).toEqual([
      {
        message: {
          type: 'next',
          payload: {
            data: {
              noteUpdated: {
                contentId: expect.any(String),
                patch: {
                  textFields: [
                    {
                      key: 'CONTENT',
                      value: {
                        newRecord: {
                          change: {
                            revision: 15,
                            changeset: [[0, 3], '. after head. published'],
                          },
                        },
                      },
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

  it('does not publish duplicate insertion', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
          variables: {
            input: {
              contentId: note.publicId,
            } as NoteUpdatedInput,
          },
        },
      } as unknown as Subscription,
    ]);

    function executeInsertRecord() {
      return apolloServer.executeOperation(
        {
          query: MUTATION,
          variables: {
            input: {
              contentId: note.publicId,
              patch: {
                textFields: [
                  {
                    key: NoteTextField.CONTENT,
                    value: {
                      insertRecord: {
                        generatedId: 'in-subscription',
                        change: {
                          revision: 14,
                          changeset: Changeset.parseValue([
                            [0, 3],
                            '. after head. published',
                          ]),
                        },
                        beforeSelection: {
                          start: 4,
                        },
                        afterSelection: {
                          start: 26,
                        },
                      },
                    },
                  },
                ],
              },
            } as UpdateNoteInput,
          },
        },
        {
          contextValue: createUserContext(user, createMockPublisher),
        }
      );
    }

    await executeInsertRecord();
    mockSocketApi.post.mockClear();
    await executeInsertRecord();

    expect(mockSocketApi.post.mock.calls).toHaveLength(0);
  });
});
