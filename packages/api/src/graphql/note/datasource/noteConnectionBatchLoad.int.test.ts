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
  User,
} from '../../../test/helpers/mongoose';
import { NoteTextField } from '../../types.generated';

import { NoteDocument } from '../../../mongoose/models/note';
import { ObjectId } from 'mongodb';
import { UserDocument } from '../../../mongoose/models/user';
import noteBatchLoad from './noteBatchLoad';
import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadContext,
} from './noteConnectionBatchLoad';

let notes: NoteDocument[];
let user: UserDocument;
let context: NoteConnectionBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(32314);

  const { notes: tmpNotes, user: tmpUser } = createUserWithNotes(
    5,
    Object.values(NoteTextField),
    {
      collabDoc: {
        recordsCount: 3,
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
        User,
        UserNote,
        Note,
        CollabText,
      },
    },
  };
});

it('loads paginated notes', async () => {
  await expect(
    noteConnectionBatchLoad(
      [
        {
          userId: user._id,
          userNotesArrayPath: 'notes.category.default.order',
          pagination: {
            last: 2,
          },
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
                      first: 2,
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
    [
      {
        readOnly: expect.any(Boolean),
        note: {
          publicId: notes.at(-2)?.publicId,
          ownerId: expect.any(ObjectId),
          collabText: {
            CONTENT: {
              headDocument: { changeset: ['head'] },
              records: [
                {
                  revision: 0,
                },
                {
                  revision: 1,
                },
              ],
            },
          },
        },
      },
      {
        readOnly: expect.any(Boolean),
        note: {
          publicId: notes.at(-1)?.publicId,
          ownerId: expect.any(ObjectId),
          collabText: {
            CONTENT: {
              headDocument: { changeset: ['head'] },
              records: [
                {
                  revision: 0,
                },
                {
                  revision: 1,
                },
              ],
            },
          },
        },
      },
    ],
  ]);
});
