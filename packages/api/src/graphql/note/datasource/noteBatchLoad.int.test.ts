/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, it, assert, expect } from 'vitest';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongoose/populate';
import {
  resetDatabase,
  UserNote,
  CollabText,
  Note,
} from '../../../test/helpers/mongoose';
import { NoteTextField } from '../../types.generated';

import { NoteDocument } from '../../../mongoose/models/note';
import { ObjectId } from 'mongodb';
import { UserDocument } from '../../../mongoose/models/user';
import noteBatchLoad, { NoteBatchLoadContext } from './noteBatchLoad';

let notes: NoteDocument[];
let user: UserDocument;
let context: NoteBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(73452);

  const { notes: tmpNotes, user: tmpUser } = createUserWithNotes(
    3,
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

  context = {
    mongoose: {
      models: {
        UserNote,
        Note,
        CollabText,
      },
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
              collabText: {
                CONTENT: {
                  headDocument: {
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
        collabText: {
          CONTENT: {
            headDocument: { changeset: ['head'] },
            records: [
              {
                revision: 8,
              },
              {
                revision: 9,
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
              collabText: {
                CONTENT: {
                  _id: 1,
                  headDocument: {
                    changeset: 1,
                    revision: 1,
                  },
                  tailDocument: {
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
        collabText: {
          CONTENT: {
            _id: expect.any(ObjectId),
            headDocument: { changeset: ['head'], revision: expect.any(Number) },
            tailDocument: { changeset: [], revision: expect.any(Number) },
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
