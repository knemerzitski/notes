/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, it, expect } from 'vitest';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongodb/populate';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import { NoteTextField } from '../../types.generated';

import { ObjectId } from 'mongodb';
import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadContext,
} from './noteConnectionBatchLoad';
import { NoteSchema } from '../../../mongodb/schema/note';
import { UserSchema } from '../../../mongodb/schema/user';

let notes: NoteSchema[];
let user: UserSchema;
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
    mongodb: {
      collections: mongoCollections,
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
