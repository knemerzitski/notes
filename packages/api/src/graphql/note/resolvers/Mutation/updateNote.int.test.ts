/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangeset } from '~collab/records/record';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  createMongoDBContext,
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  PopulateNotesOptions,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { CollectionName } from '../../../../mongodb/collections';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text';
import { NoteSchema } from '../../../../mongodb/schema/note';
import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { GraphQLResolversContext } from '../../../context';
import {
  NoteCategory,
  NoteTextField,
  NoteUpdatedInput,
  UpdateNoteInput,
  UpdateNotePayload,
} from '../../../types.generated';

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

const MUTATION_CATEGORY = `#graphql
  mutation($input: UpdateNoteInput!){
    updateNote(input: $input) {
      contentId
      patch {
        categoryName
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
    const populateBaseOptions: PopulateNotesOptions = {
      collabText() {
        return {
          recordsCount: 4,
          revisionOffset: 10,
          initialText: 'head',
          record(_recordIndex, revision) {
            return {
              changeset: Changeset.fromInsertion(`r_${revision}`).serialize(),
            };
          },
        };
      },
      userNote() {
        return {
          override: {
            readOnly: false,
          },
        };
      },
    };

    const populateNote = populateNotes(1, populateBaseOptions);
    user = populateNote.user;
    assert(populateNote.data[0] != null);
    note = populateNote.data[0].note;

    const populateReadOnlyNote = populateNotes(1, {
      ...populateBaseOptions,
      user,
      userNote() {
        return {
          override: {
            readOnly: true,
          },
        };
      },
    });
    assert(populateReadOnlyNote.data[0] != null);
    readOnlyNote = populateReadOnlyNote.data[0].note;
    readOnlyUserNote = populateReadOnlyNote.data[0].userNote;

    await populateExecuteAll();
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
        mongoCollections[CollectionName.USER_NOTES].findOne(
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
              preferences: null,
            },
          },
        });

        // Database
        const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
        assert(collabTextId != null);
        await expect(
          mongoCollections[CollectionName.COLLAB_TEXTS].findOne(
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
        expect(errors, JSON.stringify(errors, null, 2)).toBeUndefined();
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
              preferences: null,
            },
          },
        });

        // Database
        const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
        assert(collabTextId != null);
        await expect(
          mongoCollections[CollectionName.COLLAB_TEXTS].findOne(
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
              preferences: null,
            },
          },
        });
      });

      describe('tailText compose older records', () => {
        it('keeps exact records when composed on headText', async () => {
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
              contextValue: {
                ...createGraphQLResolversContext(user),
                options: {
                  collabText: {
                    maxRecordsCount: 3,
                  },
                },
              } as GraphQLResolversContext,
            }
          );

          // // Database
          const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
          assert(collabTextId != null);

          const collabText = await mongoCollections[CollectionName.COLLAB_TEXTS].findOne(
            {
              _id: collabTextId,
            },
            {
              projection: {
                _id: 0,
                tailText: 1,
                records: 1,
              },
            }
          );

          expect(collabText?.tailText.revision).toStrictEqual(12);
          expect(collabText?.records.map((record) => record.revision)).toStrictEqual([
            13, 14, 15,
          ]);
        });

        it('keeps more records when composed on older record', async () => {
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
                            generatedId: 'aa',
                            change: {
                              revision: 13,
                              changeset: Changeset.parseValue(['on_r13']),
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
              contextValue: {
                ...createGraphQLResolversContext(user),
                options: {
                  collabText: {
                    maxRecordsCount: 1,
                  },
                },
              } as GraphQLResolversContext,
            }
          );

          // // Database
          const collabTextId = note.collabTextIds[NoteTextField.CONTENT];
          assert(collabTextId != null);

          const collabText = await mongoCollections[CollectionName.COLLAB_TEXTS].findOne(
            {
              _id: collabTextId,
            },
            {
              projection: {
                _id: 0,
                tailText: 1,
                records: 1,
              },
            }
          );

          expect(collabText?.tailText.revision).toStrictEqual(13);
          expect(collabText?.records.map((record) => record.revision)).toStrictEqual([
            14, 15,
          ]);
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
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toBeUndefined();

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

    const populateResult = populateNotes(1, {
      collabText() {
        return {
          override: {
            headText: {
              revision: 5,
              changeset: ['abcdef'],
            },
            records: [
              ['a'],
              [0, 'b'],
              [[0, 1], 'c'],
              [[0, 2], 'd'],
              [[0, 3], 'e'],
              [[0, 4], 'f'],
            ].map((changeset, index) => ({
              revision: index,
              changeset,
            })),
          },
        };
      },
      userNote() {
        return {
          override: {
            readOnly: false,
          },
        };
      },
    });

    user = populateResult.user;
    assert(populateResult.data[0] != null);
    note = populateResult.data[0].note;
    collabText = populateResult.data[0].collabTextsByField.CONTENT;

    await populateExecuteAll();
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
        CollectionName.COLLAB_TEXTS
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

it('changes note category', async () => {
  const populateResult = populateNotes(1, {
    userNote() {
      return {
        override: {
          readOnly: false,
        },
      };
    },
  });
  const user = populateResult.user;
  assert(populateResult.data[0] != null);
  const userNote = populateResult.data[0].userNote;

  await populateExecuteAll();

  const response = await apolloServer.executeOperation(
    {
      query: MUTATION_CATEGORY,
      variables: {
        input: {
          contentId: userNote.note.publicId,
          patch: {
            categoryName: NoteCategory.ARCHIVE,
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
      contentId: userNote.note.publicId,
      patch: {
        categoryName: NoteCategory.ARCHIVE,
      },
    },
  });

  // Check DB in User document that category is swapped
  await expect(
    mongoCollections[CollectionName.USERS].findOne(
      {
        _id: user._id,
      },
      {
        projection: {
          'notes.category': 1,
        },
      }
    )
  ).resolves.toEqual({
    _id: user._id,
    notes: {
      category: {
        [NoteCategory.ARCHIVE]: {
          order: [expect.any(ObjectId)],
        },
        [NoteCategory.DEFAULT]: {
          order: [],
        },
        [NoteCategory.STICKY]: {
          order: [],
        },
      },
    },
  });
});
