/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  createMongoDBContext,
  mongoCollections,
  resetDatabase,
} from '../../../../test/helpers/mongodb';
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
  UpdateNotePayload,
} from '../../../types.generated';
import { apolloServer } from '../../../../test/helpers/apollo-server';

import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';
import { NoteSchema } from '../../../../mongodb/schema/note';
import {
  createPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../test/helpers/graphql-context';

import { Changeset } from '~collab/changeset/changeset';
import { CollectionName } from '../../../../mongodb/collections';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { ObjectId } from 'mongodb';
import { RevisionChangeset } from '~collab/records/record';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text';
import { GraphQLResolversContext } from '../../../context';

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

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();
});

describe('random records', () => {
  let user: UserSchema;
  let note: NoteSchema;
  let readOnlyNote: NoteSchema;
  let readOnlyUserNote: UserNoteSchema;

  beforeEach(async () => {
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
          contextValue: createGraphQLResolversContext(user),
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
          contextValue: createGraphQLResolversContext(user),
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
          contextValue: createGraphQLResolversContext(user),
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
            contextValue: createGraphQLResolversContext(user),
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
                        end: 4,
                      },
                      afterSelection: {
                        start: 16,
                        end: 16,
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
                            changeset: Changeset.parseValue([
                              'text before "r_12"',
                              [0, 3],
                            ]),
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
            contextValue: createGraphQLResolversContext(user),
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
                        end: 0,
                      },
                      afterSelection: {
                        start: 22,
                        end: 22,
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
            contextValue: createGraphQLResolversContext(user),
          }
        );

        assert(response.body.kind === 'single');
        const { errors } = response.body.singleResult;
        expect(errors?.length).toStrictEqual(1);
        expect(errors?.[0]?.message).toEqual(
          expect.stringMatching(/.*revision is old*/i)
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
            contextValue: createGraphQLResolversContext(user),
          }
        );

        assert(response.body.kind === 'single');
        const { errors } = response.body.singleResult;
        expect(errors?.length).toStrictEqual(1);
        expect(errors?.[0]?.message).toEqual(
          expect.stringMatching(/.*invalid revision.*/i)
        );
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
            contextValue: createGraphQLResolversContext(user),
          }
        );

        assert(response.body.kind === 'single');
        const { errors } = response.body.singleResult;
        expect(errors?.length).toStrictEqual(1);
        expect(errors?.[0]?.message).toEqual(
          expect.stringMatching(/.*invalid changeset.*/i)
        );
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
            contextValue: createGraphQLResolversContext(user),
          }
        );
        const response = await apolloServer.executeOperation(
          {
            query: MUTATION,
            variables,
          },
          {
            contextValue: createGraphQLResolversContext(user),
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

  describe('publish', () => {
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
          contextValue: createGraphQLResolversContext(user, {
            createPublisher,
          }),
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
            contextValue: createGraphQLResolversContext(user, {
              createPublisher,
            }),
          }
        );
      }

      await executeInsertRecord();
      mockSocketApi.post.mockClear();
      await executeInsertRecord();

      expect(mockSocketApi.post.mock.calls).toHaveLength(0);
    });
  });
});

describe('pre-determined records', () => {
  let mongoDBContext2: Awaited<ReturnType<typeof createMongoDBContext>>;
  let user: UserSchema;
  let note: NoteSchema;
  let collabText: CollabTextSchema;
  let generatedId = 0;

  function nextGeneratedId() {
    return String(generatedId++);
  }

  async function insertChange(
    change: RevisionChangeset,
    contextValue: GraphQLResolversContext
  ) {
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
                      generatedId: String(generatedId++),
                      change,
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
        contextValue,
      }
    );

    assert(response.body.kind === 'single');
    const result = response.body.singleResult;
    const data = result.data as { updateNote: UpdateNotePayload };
    expect(result.errors).toBeUndefined();

    const entry = data.updateNote.patch?.textFields?.find(
      (e) => e.key === NoteTextField.CONTENT
    );
    assert(entry != null);
    return entry.value.newRecord?.change;
  }

  beforeAll(async () => {
    mongoDBContext2 = await createMongoDBContext();
  });

  beforeEach(async () => {
    generatedId = 0;

    const {
      notes,
      user: tmpUser,
      collabTexts,
    } = populateUserWithNotes(1, [NoteTextField.CONTENT], {
      collabText: {
        records: [
          {
            userGeneratedId: nextGeneratedId(),
            changeset: ['a'],
            revision: 0,
          },
          {
            userGeneratedId: nextGeneratedId(),
            changeset: [0, 'b'],
            revision: 1,
          },
          {
            userGeneratedId: nextGeneratedId(),
            changeset: [[0, 1], 'c'],
            revision: 2,
          },
          {
            userGeneratedId: nextGeneratedId(),
            changeset: [[0, 2], 'd'],
            revision: 3,
          },
          {
            userGeneratedId: nextGeneratedId(),
            changeset: [[0, 3], 'e'],
            revision: 4,
          },
          {
            userGeneratedId: nextGeneratedId(),
            changeset: [[0, 4], 'f'],
            revision: 5,
          },
        ],
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
      userNote: {
        readOnly: false,
      },
    });

    user = tmpUser;
    assert(notes[0] != null);
    note = notes[0];
    assert(collabTexts[0] != null);
    collabText = collabTexts[0];

    await populateWithCreatedData();
  });

  it.each([...new Array<undefined>(4).keys()])(
    'handles two record insertions for the same revision at the same time using transactions (attempt %i)',
    async () => {
      await Promise.all([
        insertChange(
          {
            changeset: Changeset.parseValue([[0, 5], 'A']),
            revision: 5,
          },
          createGraphQLResolversContext(user)
        ),
        insertChange(
          {
            changeset: Changeset.parseValue([[0, 5], 'B']),
            revision: 5,
          },
          // Second insert with a different mongo client
          createGraphQLResolversContext(user, {
            mongodb: {
              client: mongoDBContext2.mongoClient,
              collections: mongoDBContext2.mongoCollections,
            },
          })
        ),
      ]);

      // Verify directly against database
      const fetchedCollabText = await mongoCollections[
        CollectionName.CollabTexts
      ].findOne(
        {
          _id: collabText._id,
        },
        {
          projection: {
            headText: {
              changeset: 1,
            },
            records: {
              changeset: 1,
              revision: 1,
            },
          },
        }
      );
      assert(fetchedCollabText != null);

      expect(
        Changeset.parseValue(fetchedCollabText.headText.changeset).joinInsertions(),
        'updateNote resolver is not using transactions'
      ).toStrictEqual('abcdefAB');

      // Records could be inserted in any order
      expect([
        [
          { changeset: [[0, 5], 'A'], revision: 6 },
          { changeset: [[0, 6], 'B'], revision: 7 },
        ],
        [
          { changeset: [[0, 5], 'B'], revision: 6 },
          { changeset: [[0, 5], 'A', 6], revision: 7 },
        ],
      ]).toContainEqual(fetchedCollabText.records.slice(6));
    }
  );
});
