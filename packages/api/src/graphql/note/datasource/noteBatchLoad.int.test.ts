/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, it, assert, expect } from 'vitest';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongodb/populate';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import { NoteTextField } from '../../types.generated';

import { ObjectId } from 'mongodb';
import noteBatchLoad, { NoteBatchLoadContext } from './noteBatchLoad';
import { NoteSchema } from '../../../mongodb/schema/note';
import { UserSchema } from '../../../mongodb/schema/user';

let notes: NoteSchema[];
let user: UserSchema;
let context: NoteBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(73452);

  const { notes: tmpNotes, user: tmpUser } = populateUserWithNotes(
    3,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 10,
        tailRevision: 0,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );
  notes = tmpNotes;
  user = tmpUser;

  await populateWithCreatedData();

  context = {
    mongodb: {
      collections: mongoCollections,
    },
  };
});

it('loads a simple note', async () => {
  const note = notes[0];
  assert(note != null);

  await expect(
    noteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            readOnly: 1,
            note: {
              publicId: 1,
              ownerId: 1,
              collabTexts: {
                CONTENT: {
                  headText: {
                    changeset: 1,
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
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      readOnly: expect.any(Boolean),
      note: {
        publicId: note.publicId,
        ownerId: expect.any(ObjectId),
        collabTexts: {
          CONTENT: {
            headText: { changeset: ['head'] },
            records: [
              {
                revision: 9,
              },
              {
                revision: 10,
              },
            ],
          },
        },
      },
    },
  ]);
});

it('loads all fields', async () => {
  const note = notes[0];
  assert(note != null);

  await expect(
    noteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            _id: 1,
            readOnly: 1,
            preferences: {
              backgroundColor: 1,
            },
            note: {
              id: 1,
              publicId: 1,
              ownerId: 1,
              collabTexts: {
                CONTENT: {
                  _id: 1,
                  headText: {
                    changeset: 1,
                    revision: 1,
                  },
                  tailText: {
                    changeset: 1,
                    revision: 1,
                  },
                  records: {
                    $query: {
                      revision: 1,
                      changeset: 1,
                      creatorUserId: 1,
                      userGeneratedId: 1,
                      afterSelection: {
                        start: 1,
                        end: 1,
                      },
                      beforeSelection: {
                        start: 1,
                        end: 1,
                      },
                    },
                    $pagination: {
                      after: '5',
                      first: 1,
                    },
                  },
                },
              },
            },
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      _id: expect.any(ObjectId),
      readOnly: expect.any(Boolean),
      preferences: {
        backgroundColor: expect.any(String),
      },
      note: {
        id: expect.any(ObjectId),
        publicId: note.publicId,
        ownerId: expect.any(ObjectId),
        collabTexts: {
          CONTENT: {
            _id: expect.any(ObjectId),
            headText: { changeset: ['head'], revision: expect.any(Number) },
            tailText: { changeset: [], revision: expect.any(Number) },
            records: [
              {
                revision: 6,
                changeset: ['r_6'],
                creatorUserId: expect.any(ObjectId),
                userGeneratedId: expect.any(String),
                afterSelection: {
                  start: 0,
                },
                beforeSelection: {
                  start: 0,
                },
              },
            ],
          },
        },
      },
    },
  ]);
});

it('loads minimal fields', async () => {
  const note = notes[0];
  assert(note != null);

  await expect(
    noteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            readOnly: 1,
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      readOnly: expect.any(Boolean),
      note: {
        publicId: note.publicId,
      },
    },
  ]);
});

it('loads shareNoteLinks', async () => {
  const note = notes[0];
  assert(note != null);

  await expect(
    noteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            shareNoteLinks: {
              $query: {
                publicId: 1,
                expireAccessCount: 1,
              },
            },
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      note: {
        publicId: note.publicId,
      },
      shareNoteLinks: [
        {
          publicId: expect.any(String),
          expireAccessCount: expect.any(Number),
        },
      ],
    },
  ]);
});

// TODO create tests:
// throws note not found when querying note owned by another user, no record in usernote
// returns other user note since usernote record is present