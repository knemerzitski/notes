/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { describe, beforeAll, it, assert, expect } from 'vitest';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongoose/populate';
import {
  resetDatabase,
  UserNote,
  CollabText,
  Note,
  User,
} from '../../../tests/helpers/mongoose';
import { NoteTextField } from '../../types.generated';
import { NotesLoader, UserNotesArrayLoader } from './notes-datasource';

import { NoteDocument } from '../../../mongoose/models/note';
import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';
import { UserDocument } from '../../../mongoose/models/user';

describe('NotesLoader', () => {
  let notes: NoteDocument[];
  let user: UserDocument;

  beforeAll(async () => {
    await resetDatabase();
    faker.seed(73452);

    const { notes: tmpNotes, user: tmpUser } = createUserWithNotes(
      5,
      Object.values(NoteTextField),
      {
        collabDoc: {
          recordsCount: 10,
          tailRevision: -1,
        },
        noteMany: {
          enumaratePublicIdByIndex: 0,
        },
      }
    );
    notes = tmpNotes;
    user = tmpUser;

    await populateWithCreatedData();
  });

  it('gets userNote', async () => {
    const loader = new NotesLoader({
      UserNote,
      Note,
      CollabText,
    });

    const note = notes[0];
    const note1 = notes[1];
    assert(note != null);
    assert(note1 != null);

    const results = await Promise.allSettled([
      loader.get({
        publicId: note.publicId,
        noteQuery: {
          note: {
            collabText: {
              CONTENT: {
                headDocument: {
                  changeset: 1,
                  revision: 1,
                },
                records: {
                  $query: {
                    revision: 1,
                    userGeneratedId: 1,
                    changeset: 1,
                  },
                  $pagination: {
                    last: 2,
                  },
                },
              },
            },
          },
          readOnly: 1,
          preferences: {
            backgroundColor: 1,
          },
        },
      }),
      loader.get({
        publicId: note1.publicId,
        noteQuery: {
          note: {
            ownerId: 1,
            collabText: {
              TITLE: {
                headDocument: {
                  revision: 1,
                },
              },
              CONTENT: {
                records: {
                  $query: {
                    revision: 1,
                  },
                  $pagination: {
                    after: '7',
                  },
                },
              },
            },
          },
        },
      }),
      loader.get({
        publicId: 'fdsfsf',
        noteQuery: {
          note: {
            ownerId: 1,
            collabText: {
              TITLE: {
                headDocument: {
                  revision: 1,
                },
              },
            },
          },
        },
      }),
    ]);

    expect(results).toMatchObject([
      {
        status: 'fulfilled',
        value: {
          readOnly: expect.any(Boolean),
          preferences: { backgroundColor: expect.any(String) },
          note: {
            publicId: 'publicId_0',
            collabText: {
              CONTENT: {
                _id: expect.any(ObjectId),
                headDocument: { changeset: ['head'], revision: 9 },
                records: [
                  {
                    userGeneratedId: expect.any(String),
                    revision: 8,
                    changeset: ['r_8'],
                  },
                  {
                    userGeneratedId: expect.any(String),
                    revision: 9,
                    changeset: ['r_9'],
                  },
                ],
              },
            },
            ownerId: expect.any(ObjectId),
          },
        },
      },
      {
        status: 'fulfilled',
        value: {
          readOnly: expect.any(Boolean),
          preferences: { backgroundColor: expect.any(String) },
          note: {
            publicId: 'publicId_1',
            collabText: {
              TITLE: {
                _id: expect.any(ObjectId),
                headDocument: { revision: 9 },
                records: [],
              },
              CONTENT: {
                _id: expect.any(ObjectId),
                headDocument: { changeset: ['head'], revision: 9 },
                records: [
                  {
                    userGeneratedId: expect.any(String),
                    revision: 8,
                    changeset: ['r_8'],
                  },
                  {
                    userGeneratedId: expect.any(String),
                    revision: 9,
                    changeset: ['r_9'],
                  },
                ],
              },
            },
            ownerId: expect.any(ObjectId),
          },
        },
      },
      {
        status: 'rejected',
        reason: expect.any(GraphQLError),
      },
    ]);

    // TODO write test that checks loader key is used
    const more = await loader.get({
      publicId: note1.publicId,
      noteQuery: {
        note: {
          ownerId: 1,
          collabText: {
            TITLE: {
              headDocument: {
                revision: 1,
              },
            },
            CONTENT: {
              records: {
                $query: {
                  revision: 1,
                },
                $pagination: {
                  after: '7',
                },
              },
            },
          },
        },
      },
    });
  });

  it('gets userNotesArray', async () => {
    const loader = new UserNotesArrayLoader({
      models: {
        User,
        UserNote,
        Note,
        CollabText,
      },
    });

    const results = await Promise.allSettled([
      loader.get({
        userId: user._id,
        userNotesArrayPath: 'notes.category.default.order',
        pagination: {
          first: 2,
        },
        noteQuery: {
          note: {
            collabText: {
              CONTENT: {
                headDocument: {
                  changeset: 1,
                  revision: 1,
                },
                records: {
                  $query: {
                    revision: 1,
                  },
                  $pagination: {
                    last: 2,
                  },
                },
              },
            },
          },
          readOnly: 1,
          preferences: {
            backgroundColor: 1,
          },
        },
      }),
      loader.get({
        userId: user._id,
        userNotesArrayPath: 'notes.category.default.order',
        pagination: {
          last: 2,
        },
        noteQuery: {
          note: {
            collabText: {
              TITLE: {
                headDocument: {
                  revision: 1,
                },
              },
            },
          },
          readOnly: 1,
        },
      }),
    ]);

    expect(results).toMatchObject([
      {
        status: 'fulfilled',
        value: [
          {
            readOnly: expect.any(Boolean),
            preferences: { backgroundColor: expect.any(String) },
            note: {
              publicId: 'publicId_0',
              collabText: {
                CONTENT: {
                  _id: expect.any(ObjectId),
                  headDocument: { changeset: ['head'], revision: 9 },
                  records: [{ revision: 8 }, { revision: 9 }],
                },
              },
            },
          },
          {
            readOnly: expect.any(Boolean),
            preferences: { backgroundColor: expect.any(String) },
            note: {
              publicId: 'publicId_1',
              collabText: {
                CONTENT: {
                  _id: expect.any(ObjectId),
                  headDocument: { changeset: ['head'], revision: 9 },
                  records: [{ revision: 8 }, { revision: 9 }],
                },
              },
            },
          },
        ],
      },
      {
        status: 'fulfilled',
        value: [
          {
            readOnly: expect.any(Boolean),
            preferences: { backgroundColor: expect.any(String) },
            note: {
              publicId: 'publicId_3',
              collabText: {
                TITLE: {
                  _id: expect.any(ObjectId),
                  headDocument: { revision: 9 },
                  records: [],
                },
              },
            },
          },
          {
            readOnly: expect.any(Boolean),
            preferences: { backgroundColor: expect.any(String) },
            note: {
              publicId: 'publicId_4',
              collabText: {
                TITLE: {
                  _id: expect.any(ObjectId),
                  headDocument: { revision: 9 },
                  records: [],
                },
              },
            },
          },
        ],
      },
    ]);
  });
});
