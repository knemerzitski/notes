/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, assert, expect } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { resetDatabase, mongoCollections } from '../../__test__/helpers/mongodb/mongodb';
import {
  populateAddNoteToUser,
  populateNotes,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../schema/note/note';
import { UserSchema } from '../schema/user/user';

import queryableNoteBatchLoad, {
  QueryableNoteBatchLoadContext,
} from './queryableNoteBatchLoad';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;
let user_noUserNote: UserSchema;
let user_hasUserNote: UserSchema;
let note: NoteSchema;

let context: QueryableNoteBatchLoadContext;

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

  user_noUserNote = fakeUserPopulateQueue();

  user_hasUserNote = fakeUserPopulateQueue();
  populateAddNoteToUser(user_hasUserNote, note);

  await populateExecuteAll();

  context = {
    collections: mongoCollections,
  };
});

it('loads a simple note', async () => {
  await expect(
    queryableNoteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            publicId: 1,
            userNotes: {
              $query: {
                isOwner: 1,
                readOnly: 1,
              },
            },
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
      ],
      context
    )
  ).resolves.toEqual([
    {
      publicId: note.publicId,
      userNotes: [
        { readOnly: expect.any(Boolean), isOwner: expect.any(Boolean) },
        { readOnly: expect.any(Boolean) },
      ],
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
  ]);
});

it('loads all fields', async () => {
  await expect(
    queryableNoteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            _id: 1,
            publicId: 1,
            userNotes: {
              $query: {
                readOnly: 1,
                isOwner: 1,
                preferences: {
                  backgroundColor: 1,
                },
              },
            },
            collabTexts: {
              CONTENT: {
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
      ],
      context
    )
  ).resolves.toEqual([
    {
      _id: expect.any(ObjectId),
      userNotes: [
        {
          readOnly: expect.any(Boolean),
          isOwner: expect.any(Boolean),
          preferences: {
            backgroundColor: expect.any(String),
          },
        },
        {
          readOnly: expect.any(Boolean),
          preferences: {
            backgroundColor: expect.any(String),
          },
        },
      ],
      publicId: note.publicId,
      collabTexts: {
        CONTENT: {
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
  ]);
});

it('loads minimal fields', async () => {
  await expect(
    queryableNoteBatchLoad(
      [
        {
          userId: user._id,
          publicId: note.publicId,
          noteQuery: {
            userNotes: {
              $query: {
                readOnly: 1,
              },
            },
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      publicId: note.publicId,
      userNotes: [
        {
          readOnly: expect.any(Boolean),
        },
        {
          readOnly: expect.any(Boolean),
        },
      ],
    },
  ]);
});

it('loads shareNoteLinks', async () => {
  await expect(
    queryableNoteBatchLoad(
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
      publicId: note.publicId,
      shareNoteLinks: [
        {
          publicId: expect.any(String),
          expireAccessCount: expect.any(Number),
        },
      ],
    },
  ]);
});

it('throws error for user without userNote', async () => {
  const result = await queryableNoteBatchLoad(
    [
      {
        userId: user_noUserNote._id,
        publicId: note.publicId,
        noteQuery: {
          _id: 1,
        },
      },
    ],
    context
  );
  expect((result[0] as Error).message).toEqual(
    expect.stringMatching(/Note '.+' not found/)
  );
});

it('loads a note for user who has UserNote document', async () => {
  await expect(
    queryableNoteBatchLoad(
      [
        {
          userId: user_hasUserNote._id,
          publicId: note.publicId,
          noteQuery: {
            _id: 1,
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      _id: expect.any(ObjectId),
      publicId: expect.any(String),
    },
  ]);
});
