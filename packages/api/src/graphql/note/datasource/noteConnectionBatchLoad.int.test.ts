/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, expect } from 'vitest';

import { RelayPagination } from '../../../mongodb/operations/pagination/relayArrayPagination';
import { getNotesArrayPath, UserSchema } from '../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongodb/populate';
import { NoteCategory, NoteTextField } from '../../types.generated';

import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadContext,
  NoteConnectionKey,
} from './noteConnectionBatchLoad';

let userNotes: UserNoteSchema[];
let user: UserSchema;
let context: NoteConnectionBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(32314);

  const { userNotes: tmpUserNotes, user: tmpUser } = populateUserWithNotes(
    5,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 3,
        tailRevision: 0,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );
  userNotes = tmpUserNotes;
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
          userNotesArrayPath: getNotesArrayPath(NoteCategory.DEFAULT),
          pagination: {
            last: 2,
          },
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
    {
      userNotes: [
        {
          readOnly: expect.any(Boolean),
          note: {
            publicId: 'publicId_3',
            ownerId: expect.any(ObjectId),
            collabTexts: {
              CONTENT: {
                headText: { changeset: ['head'] },
                records: [
                  {
                    revision: 1,
                  },
                  {
                    revision: 2,
                  },
                ],
              },
            },
          },
        },
        {
          readOnly: expect.any(Boolean),
          note: {
            publicId: 'publicId_4',
            ownerId: expect.any(ObjectId),
            collabTexts: {
              CONTENT: {
                headText: { changeset: ['head'] },
                records: [
                  {
                    revision: 1,
                  },
                  {
                    revision: 2,
                  },
                ],
              },
            },
          },
        },
      ],
    },
  ]);
});

it('loads custom query with normal pagination', async () => {
  await expect(
    noteConnectionBatchLoad(
      [
        {
          userId: user._id,
          userNotesArrayPath: getNotesArrayPath(NoteCategory.DEFAULT),
          pagination: {
            first: 1,
          },
          noteQuery: {
            _id: 1,
          },
          customQuery: {
            query: {
              lastElement: {
                $last: `$${getNotesArrayPath(NoteCategory.DEFAULT)}`,
              },
            },
            group: {
              lastElement: { $first: '$lastElement' },
            },
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      lastElement: expect.any(ObjectId),
      userNotes: [
        {
          _id: expect.any(ObjectId),
          note: {
            publicId: expect.any(String),
          },
        },
      ],
    },
  ]);
});

it('loads multiple different paginations', async () => {
  function createKey(pagination: RelayPagination<ObjectId>): NoteConnectionKey {
    return {
      userId: user._id,
      userNotesArrayPath: getNotesArrayPath(NoteCategory.DEFAULT),
      pagination,
      noteQuery: {
        note: {
          publicId: 1,
        },
      },
    };
  }

  await expect(
    noteConnectionBatchLoad(
      [
        createKey({ first: 1 }),
        createKey({ last: 1 }),
        createKey({ first: 1 }),
        createKey({ last: 1 }),
        createKey({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          after: userNotes.at(1)!._id,
          first: 1,
        }),
      ],
      context
    )
  ).resolves.toEqual([
    {
      userNotes: [
        {
          note: {
            publicId: 'publicId_0',
          },
        },
      ],
    },
    {
      userNotes: [
        {
          note: {
            publicId: 'publicId_4',
          },
        },
      ],
    },
    {
      userNotes: [
        {
          note: {
            publicId: 'publicId_0',
          },
        },
      ],
    },
    {
      userNotes: [
        {
          note: {
            publicId: 'publicId_4',
          },
        },
      ],
    },
    {
      userNotes: [
        {
          note: {
            publicId: 'publicId_2',
          },
        },
      ],
    },
  ]);
});
