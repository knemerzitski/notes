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
  NoteConnectionKey,
} from './noteConnectionBatchLoad';
import { UserSchema } from '../../../mongodb/schema/user';
import { RelayPagination } from '../../../mongodb/operations/pagination/relayArrayPagination';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';

let userNotes: UserNoteSchema[];
let user: UserSchema;
let context: NoteConnectionBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(32314);

  const { userNotes: tmpUserNotes, user: tmpUser } = createUserWithNotes(
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
          userNotesArrayPath: 'notes.category.default.order',
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
            publicId: 'publicId_4',
            ownerId: expect.any(ObjectId),
            collabTexts: {
              CONTENT: {
                headText: { changeset: ['head'] },
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
    },
  ]);
});

it('loads custom query with normal pagination', async () => {
  await expect(
    noteConnectionBatchLoad(
      [
        {
          userId: user._id,
          userNotesArrayPath: 'notes.category.default.order',
          pagination: {
            first: 1,
          },
          noteQuery: {
            _id: 1,
          },
          customQuery: {
            query: {
              lastElement: {
                $last: '$notes.category.default.order',
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
      userNotesArrayPath: 'notes.category.default.order',
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
