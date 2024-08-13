/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, assert, expect } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { resetDatabase, mongoCollections } from '../../__test__/helpers/mongodb/mongodb';
import {
  TestCollabTextKey,
  populateUserAddNote,
  populateNotes,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../schema/note/note';

import {
  queryableNoteBatchLoad,
  QueryableNoteLoaderParams,
} from './queryable-note-loader';

let populateResult: ReturnType<typeof populateNotes>;
let note: NoteSchema;

let context: QueryableNoteLoaderParams['context'];

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
  });
  const firstNote = populateResult.data[0]?.note;
  assert(firstNote != null);
  note = firstNote;

  // @ts-expect-error
  const _user_noUsersEntry = fakeUserPopulateQueue();

  const user_hasUsersEntry = fakeUserPopulateQueue();
  populateUserAddNote(user_hasUsersEntry, note);

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
          id: {
            noteId: note._id,
          },
          query: {
            _id: 1,
            users: {
              $query: {
                createdAt: 1,
                readOnly: 1,
              },
            },
            collabTexts: {
              [TestCollabTextKey.TEXT]: {
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
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toEqual([
    {
      _id: note._id,
      users: [
        { readOnly: expect.any(Boolean), createdAt: expect.any(Date) },
        { readOnly: expect.any(Boolean), createdAt: expect.any(Date) },
      ],
      collabTexts: {
        [TestCollabTextKey.TEXT]: {
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
          id: {
            noteId: note._id,
          },
          query: {
            _id: 1,
            users: {
              $query: {
                readOnly: 1,
                createdAt: 1,
                preferences: {
                  backgroundColor: 1,
                },
              },
            },
            collabTexts: {
              [TestCollabTextKey.TEXT]: {
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
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toEqual([
    {
      _id: expect.any(ObjectId),
      users: [
        {
          readOnly: expect.any(Boolean),
          createdAt: expect.any(Date),
          preferences: {
            backgroundColor: expect.any(String),
          },
        },
        {
          readOnly: expect.any(Boolean),
          createdAt: expect.any(Date),
          preferences: {
            backgroundColor: expect.any(String),
          },
        },
      ],
      collabTexts: {
        [TestCollabTextKey.TEXT]: {
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
          id: {
            noteId: note._id,
          },
          query: {
            users: {
              $query: {
                readOnly: 1,
              },
            },
          },
        },
      ],
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toEqual([
    {
      users: [
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
          id: {
            noteId: note._id,
          },
          query: {
            shareNoteLinks: {
              $query: {
                publicId: 1,
                expireAccessCount: 1,
              },
            },
          },
        },
      ],
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toEqual([
    {
      shareNoteLinks: [
        {
          publicId: expect.any(String),
          expireAccessCount: expect.any(Number),
        },
      ],
    },
  ]);
});
