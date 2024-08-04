/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
  createMockedPublisher,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseErrorMessage,
} from '../../../../__test__/helpers/graphql/response';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { noteDefaultValues, NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  CreateNoteInput,
  CreateNotePayload,
  NoteCategory,
  NoteTextField,
} from '../../../types.generated';

const MUTATION_ALL = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      note {
        id
        contentId
        readOnly
        isOwner
        categoryName
        sharing {
          id
        }
        preferences {
          backgroundColor
        }
        textFields {
          key
          value {
            headText {
              revision
              changeset
            }
            tailText {
              revision
              changeset
            }
            recordsConnection(last: 2) {
              records {
                creatorUserId
                change {
                  changeset
                  revision
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
            }
          }
        }
      }
    }
  }
`;

const MUTATION_MINIMAL_TEXTFIELDS = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      note {
        textFields(name: CONTENT) {
          key
          value {
            headText {
              revision
            }
          }
        }
      }
    }
  }
`;

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

async function executeOperation(
  input?: CreateNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION_ALL
) {
  return await apolloServer.executeOperation<
    {
      createNote: CreateNotePayload;
    },
    { input?: CreateNoteInput }
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

let user: UserSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  user = fakeUserPopulateQueue();
});

describe('no existing notes', () => {
  beforeEach(async () => {
    await populateExecuteAll();
  });

  it('creates note without specifying any input', async () => {
    const response = await executeOperation({}, { user });

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      createNote: {
        note: {
          id: expect.any(String),
          contentId: expect.any(String),
          categoryName: NoteCategory.DEFAULT,
          isOwner: true,
          readOnly: false,
          sharing: null,
          preferences: {
            backgroundColor: null,
          },
          textFields: Object.values(NoteTextField).map((fieldName) => ({
            key: fieldName,
            value: {
              headText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              recordsConnection: {
                records: [],
              },
            },
          })),
        },
      },
    });

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.DEFAULT]: {
              order: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.notes.category[NoteCategory.DEFAULT]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      publicId: expect.any(String),
      userNotes: [
        {
          userId: user._id,
          categoryName: NoteCategory.DEFAULT,
          isOwner: true,
        },
      ],
    });
  });

  it('creates note with all inputs', async () => {
    const response = await executeOperation(
      {
        note: {
          categoryName: NoteCategory.ARCHIVE,
          preferences: {
            backgroundColor: '#cacc52',
          },
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                initialText: 'initial title',
              },
            },
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'initial content',
              },
            },
          ],
        },
      },
      { user }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      createNote: {
        note: {
          id: expect.any(String),
          contentId: expect.any(String),
          categoryName: NoteCategory.ARCHIVE,
          isOwner: true,
          readOnly: false,
          sharing: null,
          preferences: {
            backgroundColor: '#cacc52',
          },
          textFields: expect.arrayContaining([
            {
              key: NoteTextField.CONTENT,
              value: {
                headText: {
                  changeset: Changeset.fromInsertion('initial content').serialize(),
                  revision: 1,
                },
                tailText: {
                  changeset: Changeset.EMPTY.serialize(),
                  revision: 0,
                },
                recordsConnection: {
                  records: [
                    {
                      creatorUserId: expect.any(String),
                      change: {
                        changeset: Changeset.fromInsertion('initial content').serialize(),
                        revision: 1,
                      },
                      beforeSelection: {
                        start: 0,
                        end: null,
                      },
                      afterSelection: {
                        start: 15,
                        end: null,
                      },
                    },
                  ],
                },
              },
            },
            {
              key: NoteTextField.TITLE,
              value: {
                headText: {
                  changeset: Changeset.fromInsertion('initial title').serialize(),
                  revision: 1,
                },
                tailText: {
                  changeset: Changeset.EMPTY.serialize(),
                  revision: 0,
                },
                recordsConnection: {
                  records: [
                    {
                      creatorUserId: expect.any(String),
                      change: {
                        changeset: Changeset.fromInsertion('initial title').serialize(),
                        revision: 1,
                      },
                      beforeSelection: {
                        start: 0,
                        end: null,
                      },
                      afterSelection: {
                        start: 13,
                        end: null,
                      },
                    },
                  ],
                },
              },
            },
          ]),
        },
      },
    });

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.ARCHIVE]: {
              order: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.notes.category[NoteCategory.ARCHIVE]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      publicId: expect.any(String),
      userNotes: [
        {
          userId: user._id,
          categoryName: NoteCategory.ARCHIVE,
          isOwner: true,
          preferences: {
            backgroundColor: '#cacc52',
          },
        },
      ],
      collabTexts: expect.arrayContaining([
        {
          k: NoteTextField.CONTENT,
          v: {
            headText: {
              changeset: Changeset.fromInsertion('initial content').serialize(),
              revision: 1,
            },
            tailText: {
              changeset: Changeset.EMPTY.serialize(),
              revision: 0,
            },
            records: [
              {
                changeset: Changeset.fromInsertion('initial content').serialize(),
                revision: 1,
                creatorUserId: user._id,
                userGeneratedId: expect.any(String),
                beforeSelection: {
                  start: 0,
                },
                afterSelection: {
                  start: 15,
                },
              },
            ],
          },
        },
        {
          k: NoteTextField.TITLE,
          v: {
            headText: {
              changeset: Changeset.fromInsertion('initial title').serialize(),
              revision: 1,
            },
            tailText: {
              changeset: Changeset.EMPTY.serialize(),
              revision: 0,
            },
            records: [
              {
                changeset: Changeset.fromInsertion('initial title').serialize(),
                revision: 1,
                creatorUserId: user._id,
                userGeneratedId: expect.any(String),
                beforeSelection: {
                  start: 0,
                },
                afterSelection: {
                  start: 13,
                },
              },
            ],
          },
        },
      ]),
    });
  });

  it('ignores duplicate textFields entries', async () => {
    const response = await executeOperation(
      {
        note: {
          textFields: [
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'a',
              },
            },
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'b',
              },
            },
          ],
        },
      },
      { user },
      MUTATION_MINIMAL_TEXTFIELDS
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      createNote: {
        note: {
          textFields: expect.arrayContaining([
            {
              key: NoteTextField.CONTENT,
              value: {
                headText: {
                  revision: 1,
                },
              },
            },
          ]),
        },
      },
    });

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    const noteId = dbUser?.notes.category[NoteCategory.DEFAULT]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      publicId: expect.any(String),
      userNotes: [
        {
          userId: user._id,
          categoryName: NoteCategory.DEFAULT,
          isOwner: true,
        },
      ],
      collabTexts: expect.arrayContaining([
        {
          k: NoteTextField.CONTENT,
          v: {
            headText: {
              changeset: Changeset.fromInsertion('a').serialize(),
              revision: 1,
            },
            tailText: {
              changeset: Changeset.EMPTY.serialize(),
              revision: 0,
            },
            records: [
              {
                changeset: Changeset.fromInsertion('a').serialize(),
                revision: 1,
                creatorUserId: user._id,
                userGeneratedId: expect.any(String),
                beforeSelection: {
                  start: 0,
                },
                afterSelection: {
                  start: 1,
                },
              },
            ],
          },
        },
      ]),
    });
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({}, { user: undefined });
    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);

    // Database not modified
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser, 'Expected User collection to be unmodified').toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {},
        },
      })
    );
    const dbNote = await mongoCollections.notes.find().toArray();
    expect(dbNote, 'Expected Note collection to be unmodified').toStrictEqual([]);
  });

  it('throws error if input text is too large', async () => {
    const response = await executeOperation(
      {
        note: {
          textFields: [
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'a'.repeat(100001),
              },
            },
          ],
        },
      },
      { user }
    );
    expectGraphQLResponseErrorMessage(response, /got invalid value/);
  });

  describe('spyOn publicId', () => {
    let spyPublicId: MockInstance<[], string>;

    beforeAll(() => {
      spyPublicId = vi.spyOn(noteDefaultValues, 'publicId');
    });

    afterEach(() => {
      spyPublicId.mockReset();
    });

    afterAll(() => {
      spyPublicId.mockRestore();
    });

    it('handles duplicate publicId by rerunning the resolver', async () => {
      spyPublicId.mockReturnValueOnce('a');
      expectGraphQLResponseData(await executeOperation({}, { user }));

      // publicId 'a' is now duplicate
      spyPublicId.mockReturnValueOnce('a');
      expectGraphQLResponseData(await executeOperation({}, { user }));
    });
  });

  describe('subscription noteCreated', () => {
    it('publishes created note to current user', async () => {
      mockSubscriptionsModel.queryAllByTopic.mockResolvedValueOnce([
        {
          subscription: {
            query: SUBSCRIPTION,
          },
        } as Subscription,
      ]);

      const response = await executeOperation(
        {
          note: {
            textFields: [
              {
                key: NoteTextField.CONTENT,
                value: {
                  initialText: 'content',
                },
              },
            ],
          },
        },
        {
          user,
          createPublisher: createMockedPublisher,
        }
      );
      expectGraphQLResponseData(response);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
        expect.stringContaining(`${SubscriptionTopicPrefix.NOTE_CREATED}:`)
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSocketApi.post).toHaveBeenLastCalledWith({
        message: expect.objectContaining({
          type: 'next',
          payload: {
            data: {
              noteCreated: {
                note: {
                  contentId: expect.any(String),
                  textFields: expect.arrayContaining([
                    {
                      key: NoteTextField.CONTENT,
                      value: {
                        headText: {
                          changeset: Changeset.fromInsertion('content').serialize(),
                        },
                      },
                    },
                    {
                      key: NoteTextField.TITLE,
                      value: { headText: { changeset: Changeset.EMPTY.serialize() } },
                    },
                  ]),
                },
              },
            },
          },
        }),
      });
    });
  });
});

describe('have existing note', () => {
  let existingNote: NoteSchema;
  beforeEach(async () => {
    existingNote = fakeNotePopulateQueue(user);

    userAddNote(user, existingNote, {
      override: {
        categoryName: NoteCategory.DEFAULT,
      },
    });

    await populateExecuteAll();
  });

  it('pushes new note to end of array', async () => {
    const response = await executeOperation({}, { user });
    expectGraphQLResponseData(response);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser, 'Note was not pushed to end of "order" array').toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.DEFAULT]: {
              order: [existingNote._id, expect.any(ObjectId)],
            },
          },
        },
      })
    );
  });
});
