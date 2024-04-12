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
} from '../../../tests/helpers/mongoose';
import { NoteTextField } from '../../types.generated';
import NotesLoader from './notes-loader';

import { NoteDocument } from '../../../mongoose/models/note';
import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

describe('NotesLoader', () => {
  let notes: NoteDocument[];

  beforeAll(async () => {
    await resetDatabase();
    faker.seed(73458);

    const { notes: tmpNotes } = createUserWithNotes(2, Object.values(NoteTextField), {
      collabDoc: {
        recordsCount: 10,
        tailRevision: -1,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    });
    notes = tmpNotes;

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
      loader.get(note.publicId, {
        note: {
          collabText: {
            CONTENT: {
              headDocument: {
                changeset: 1,
                revision: 1,
              },
              records: {
                $project: {
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
      }),
      loader.get(note1.publicId, {
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
                $project: {
                  revision: 1,
                },
                $pagination: {
                  after: '7',
                },
              },
            },
          },
        },
      }),
      loader.get('fdsfsf', {
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
      }),
    ]);

    expect(results).toMatchObject([
      {
        status: 'fulfilled',
        value: {
          readOnly: false,
          preferences: { backgroundColor: '#dd3c8e' },
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
          readOnly: true,
          preferences: { backgroundColor: '#9d01dd' },
          note: {
            publicId: 'publicId_1',
            collabText: {
              TITLE: {
                _id: expect.any(ObjectId),
                headDocument: { revision: 9 },
                records: undefined,
              },
              CONTENT: {
                _id: expect.any(ObjectId),
                headDocument: { changeset: ['head'], revision: 9 },
                records: [
                  {
                    userGeneratedId: '022a32f3-7721-4330-ae92-bd45280c94c7',
                    revision: 8,
                    changeset: ['r_8'],
                  },
                  {
                    userGeneratedId: '21ac1d0f-d4df-4645-bd4a-862b0e69e130',
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

    console.log('after');

    // TODO write test that checks loader key is used
    const more = await loader.get(note1.publicId, {
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
              $project: {
                revision: 1,
              },
              $pagination: {
                after: '7',
              },
            },
          },
        },
      },
    });
    console.log('more', more);
  });
});
