/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, assert, expect } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import {
  mongoCollections,
  resetDatabase,
} from '../../../__test__/helpers/mongodb/mongodb';

import { populateNotes } from '../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteSchema } from '../../../mongodb/schema/note';
import { UserSchema } from '../../../mongodb/schema/user';

import noteBatchLoad, { NoteBatchLoadContext } from './noteBatchLoad';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;
let note: NoteSchema;

let context: NoteBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(73452);

  populateResult = populateNotes(3, {
    collabText() {
      return {
        recordsCount: 10,
        initialText: 'head',
        record(_recordIndex, revision) {
          return {
            changeset: Changeset.fromInsertion(`r_${revision}`).serialize(),
          };
        },
      };
    },
    note(noteIndex) {
      return {
        override: {
          publicId: `publicId_${noteIndex}`,
        },
      };
    },
  });
  user = populateResult.user;
  const firstNote = populateResult.data[0]?.note;
  assert(firstNote != null);
  note = firstNote;

  await populateExecuteAll();

  context = {
    mongodb: {
      collections: mongoCollections,
    },
  };
});

it('loads a simple note', async () => {
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
                  start: 4,
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
