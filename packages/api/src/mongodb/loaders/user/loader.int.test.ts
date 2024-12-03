/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, expect, beforeEach } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
  mongoCollectionStats,
} from '../../../__tests__/helpers/mongodb/mongodb';
import {
  TestNoteCategory,
  populateNotes,
} from '../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';

import { fakeUserPopulateQueue } from '../../../__tests__/helpers/mongodb/populate/user';
import { CursorPagination } from '../../pagination/cursor-struct';
import { DBUserSchema } from '../../schema/user';

import { batchLoad } from './batch-load';
import { QueryableUserLoaderKey, QueryableUserLoaderParams } from './loader';

let populateResult: ReturnType<typeof populateNotes>;
let mainNotesIds: ObjectId[];
let otherNotesIds: ObjectId[];
let user: DBUserSchema;
let user2: DBUserSchema;

let context: QueryableUserLoaderParams['context'];

beforeAll(async () => {
  await resetDatabase();
  faker.seed(32314);

  populateResult = populateNotes(10, {
    collabText() {
      return {
        recordsCount: 3,
        initialText: 'head',
      };
    },
    noteUser(noteIndex) {
      return {
        override: {
          categoryName:
            noteIndex % 2 === 0 ? TestNoteCategory.MAIN : TestNoteCategory.OTHER,
        },
      };
    },
  });
  user = populateResult.user;

  mainNotesIds = populateResult.data
    .filter((_, index) => index % 2 === 0)
    .map((data) => data.note._id);
  otherNotesIds = populateResult.data
    .filter((_, index) => index % 2 !== 0)
    .map((data) => data.note._id);

  user2 = fakeUserPopulateQueue();

  await populateExecuteAll();

  context = {
    collections: mongoCollections,
  };
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

it('loads paginated notes', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            note: {
              categories: {
                [TestNoteCategory.MAIN]: {
                  notes: {
                    $pagination: {
                      last: 2,
                    },
                    _id: 1,
                    users: {
                      readOnly: 1,
                      createdAt: 1,
                    },
                    collabText: {
                      headText: {
                        changeset: 1,
                      },
                      records: {
                        $pagination: {
                          first: 2,
                        },
                        revision: 1,
                      },
                    },
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
      note: {
        categories: {
          [TestNoteCategory.MAIN]: {
            notes: [
              {
                _id: mainNotesIds.at(-2),
                users: [
                  {
                    createdAt: expect.any(Date),
                    readOnly: expect.any(Boolean),
                  },
                ],
                collabText: {
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
              {
                _id: mainNotesIds.at(-1),
                users: [
                  {
                    createdAt: expect.any(Date),
                    readOnly: expect.any(Boolean),
                  },
                ],
                collabText: {
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
            ],
          },
        },
      },
    },
  ]);
});

it('loads many different paginations', async () => {
  function createLoadKey(
    categoryName: TestNoteCategory,
    pagination: CursorPagination<ObjectId>
  ): QueryableUserLoaderKey {
    return {
      id: {
        userId: user._id,
      },
      query: {
        note: {
          categories: {
            [categoryName]: {
              notes: {
                $pagination: pagination,
                _id: 1,
              },
            },
          },
        },
      },
    };
  }

  function wrapUserNotes(categoryName: TestNoteCategory, userNotes: unknown) {
    return {
      note: {
        categories: {
          [categoryName]: {
            notes: userNotes,
          },
        },
      },
    };
  }

  await expect(
    batchLoad(
      [
        createLoadKey(TestNoteCategory.MAIN, { first: 1 }), // 0
        createLoadKey(TestNoteCategory.OTHER, { last: 1 }), // 9
        createLoadKey(TestNoteCategory.OTHER, { first: 1 }), // 1
        createLoadKey(TestNoteCategory.MAIN, { last: 1 }), // 8
        createLoadKey(TestNoteCategory.OTHER, {
           
          after: otherNotesIds.at(0),
          first: 1,
        }), // 3
      ],
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toMatchObject([
    wrapUserNotes(TestNoteCategory.MAIN, [
      {
        _id: mainNotesIds.at(0),
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        _id: otherNotesIds.at(-1),
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        _id: otherNotesIds.at(0),
      },
    ]),
    wrapUserNotes(TestNoteCategory.MAIN, [
      {
        _id: mainNotesIds.at(-1),
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        _id: otherNotesIds.at(1),
      },
    ]),
  ]);
});

it('loads firstId, lastId with pagination', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            note: {
              categories: {
                [TestNoteCategory.MAIN]: {
                  notes: {
                    $pagination: {
                      first: 1,
                    },
                    _id: 1,
                  },
                  firstNoteId: 1,
                  lastNoteId: 1,
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
      note: {
        categories: {
          [TestNoteCategory.MAIN]: {
            notes: [
              {
                _id: mainNotesIds.at(0),
              },
            ],
            firstNoteId: mainNotesIds.at(0),
            lastNoteId: mainNotesIds.at(-1),
          },
        },
      },
    },
  ]);
});

it('returns empty array for invalid path', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            note: {
              categories: {
                invalid_category: {
                  notes: {
                    $pagination: {
                      last: 2,
                    },
                    _id: 1,
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
      note: {
        categories: {
          invalid_category: {
            notes: [],
          },
        },
      },
    },
  ]);
});

it('loads all notes without pagination', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            note: {
              categories: {
                [TestNoteCategory.MAIN]: {
                  notes: {
                    _id: 1,
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
      note: {
        categories: {
          [TestNoteCategory.MAIN]: {
            notes: mainNotesIds.map((id) => ({ _id: id })),
          },
        },
      },
    },
  ]);
});

it('loads two users in a single db call', async () => {
  await expect(
    batchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            _id: 1,
          },
        },
        {
          id: {
            googleUserId: user2.thirdParty!.google!.id!,
          },
          query: {
            _id: 1,
          },
        },
      ],
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toStrictEqual([
    {
      _id: user._id,
    },
    {
      _id: user2._id,
    },
  ]);

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
});
