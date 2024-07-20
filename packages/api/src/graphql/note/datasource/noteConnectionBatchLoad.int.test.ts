/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, expect } from 'vitest';

import { RelayPagination } from '../../../mongodb/operations/pagination/relayArrayPagination';
import { getNotesArrayPath, UserSchema } from '../../../mongodb/schema/user';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import { populateNotes } from '../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../test/helpers/mongodb/populate/populate-queue';
import { NoteCategory } from '../../types.generated';

import noteConnectionBatchLoad, {
  NoteConnectionBatchLoadContext,
  NoteConnectionKey,
} from './noteConnectionBatchLoad';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;

let context: NoteConnectionBatchLoadContext;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(32314);

  populateResult = populateNotes(5, {
    collabText() {
      return {
        recordsCount: 3,
        initialText: 'head',
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

  await populateExecuteAll();

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
          after: populateResult.data.at(1)?.userNote!._id,
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
