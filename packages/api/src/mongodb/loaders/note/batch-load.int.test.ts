/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, assert, expect, beforeEach } from 'vitest';

import { Changeset, Selection } from '../../../../../collab2/src';

import {
  resetDatabase,
  mongoCollections,
  mongoCollectionStats,
} from '../../../__tests__/helpers/mongodb/instance';
import {
  populateUserAddNote,
  populateNotes,
} from '../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../__tests__/helpers/mongodb/populate/user';
import { CursorPagination } from '../../pagination/cursor-struct';
import { DBNoteSchema } from '../../schema/note';

import { DBUserSchema } from '../../schema/user';

import { batchLoad } from './batch-load';
import { QueryableNoteLoaderParams } from './loader';

let populateResult: ReturnType<typeof populateNotes>;
let user: DBUserSchema;
let note: DBNoteSchema;

let context: QueryableNoteLoaderParams['context'];

beforeAll(async () => {
  await resetDatabase();
  faker.seed(73452);

  populateResult = populateNotes(3, {
    mapCollabText() {
      return {
        records: 10,
        initialText: 'head',
        mapRecord(record) {
          return {
            ...record,
            override: {
              ...record.override,
              changeset: Changeset.fromText(
                `r_${record.override?.revision ?? 'unknown'}`
              ).serialize(),
            },
          };
        },
      };
    },
  });

  user = populateResult.user;
  const firstNote = populateResult.data[0]?.note;
  assert(firstNote != null);
  note = firstNote;

  const _user_noUsersEntry = fakeUserPopulateQueue();

  const user_hasUsersEntry = fakeUserPopulateQueue();
  populateUserAddNote(user_hasUsersEntry, note);

  await populateExecuteAll();

  context = {
    collections: mongoCollections,
  };
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

it('loads a simple note', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            noteId: note._id,
          },
          query: {
            _id: 1,
            users: {
              createdAt: 1,
              readOnly: 1,
            },
            collabText: {
              headText: {
                changeset: 1,
              },
              records: {
                $pagination: {
                  last: 2,
                },
                revision: 1,
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
      collabText: {
        headText: { changeset: Changeset.parse('0:"head"').serialize() },
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
  ]);
});

it('loads all fields', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            noteId: note._id,
          },
          query: {
            _id: 1,
            users: {
              readOnly: 1,
              createdAt: 1,
              preferences: {
                backgroundColor: 1,
              },
            },
            collabText: {
              headText: {
                changeset: 1,
                revision: 1,
              },
              tailText: {
                changeset: 1,
                revision: 1,
              },
              records: {
                $pagination: {
                  after: 5,
                  first: 1,
                },
                revision: 1,
                changeset: 1,
                author: {
                  _id: 1,
                },
                idempotencyId: 1,
                selectionInverse: 1,
                selection: 1,
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
      collabText: {
        headText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: expect.any(Number),
        },
        tailText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: expect.any(Number),
        },
        records: [
          {
            revision: 6,
            changeset: Changeset.parse('0:"r_6"').serialize(),
            author: {
              _id: expect.any(ObjectId),
            },
            idempotencyId: expect.any(String),
            selectionInverse: Selection.ZERO.serialize(),
            selection: Selection.create(4).serialize(),
          },
        ],
      },
    },
  ]);
});

it('loads minimal fields', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            noteId: note._id,
          },
          query: {
            users: {
              readOnly: 1,
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

it('loads shareLinks', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            noteId: note._id,
          },
          query: {
            shareLinks: {
              _id: 1,
              expireAccessCount: 1,
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
      shareLinks: [
        {
          _id: expect.any(ObjectId),
          expireAccessCount: expect.any(Number),
        },
      ],
    },
  ]);
});

it('loads users.openNote', async () => {
  await mongoCollections.openNotes.insertOne({
    noteId: note._id,
    userId: user._id,
    collabText: {
      revision: 10,
      latestSelection: Selection.create(12).serialize(),
    },
    clients: [],
    expireAt: new Date(Date.now() + 100000),
  });

  const result = await batchLoad(
    [
      {
        id: {
          noteId: note._id,
        },
        query: {
          users: {
            _id: 1,
            openNote: {
              collabText: {
                revision: 1,
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
  );

  expect(result).toEqual([
    expect.objectContaining({
      users: expect.arrayContaining([
        {
          _id: user._id,
          openNote: {
            collabText: {
              revision: 10,
            },
          },
        },
      ]),
    }),
  ]);
});

it('loads multiple records paginations', async () => {
  // [1,2,3,4,5,6,7,8,9,10]
  const testSet: { pagination: CursorPagination<number>; revisions: number[] }[] = [
    {
      pagination: {
        first: 2,
      },
      revisions: [1, 2],
    },
    {
      pagination: {
        last: 3,
      },
      revisions: [8, 9, 10],
    },
    {
      pagination: {
        after: 5,
        first: 1,
      },
      revisions: [6],
    },
    {
      pagination: {
        before: 4,
        last: 1,
      },
      revisions: [3],
    },
    {
      pagination: {
        before: 4,
      },
      revisions: [1, 2, 3],
    },
    {
      pagination: {
        after: 7,
      },
      revisions: [8, 9, 10],
    },
  ];

  function paginateRecords(
    pagination: CursorPagination<number>
  ): Parameters<typeof batchLoad>[0][0] {
    return {
      id: {
        noteId: note._id,
      },
      query: {
        collabText: {
          records: {
            $pagination: pagination,
            revision: 1,
          },
        },
      },
    };
  }

  function getRevisions(value: Awaited<ReturnType<typeof batchLoad>>[0] | undefined) {
    if (!value) {
      return;
    }

    if (value instanceof Error) {
      throw value;
    }

    return value.collabText?.records?.map((r) => r?.revision ?? -1) ?? [];
  }

  const results = await batchLoad(
    testSet.map(({ pagination }) => paginateRecords(pagination)),
    {
      global: context,
      request: undefined,
    }
  );

  for (let i = 0; i < testSet.length; i++) {
    const result = results[i];
    expect(getRevisions(result)).toStrictEqual(testSet[i]?.revisions);
  }
});
