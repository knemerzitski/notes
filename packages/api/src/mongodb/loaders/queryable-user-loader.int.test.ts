/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, expect, beforeEach } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
  mongoCollectionStats,
} from '../../__test__/helpers/mongodb/mongodb';
import {
  TestCollabTextKey,
  TestNoteCategory,
  populateNotes,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { RelayPagination } from '../pagination/relay-array-pagination';
import { UserSchema } from '../schema/user/user';

import {
  queryableUserBatchLoad,
  QueryableUserLoaderKey,
  QueryableUserLoaderParams,
} from './queryable-user-loader';
import { fakeUserPopulateQueue } from '../../__test__/helpers/mongodb/populate/user';

let populateResult: ReturnType<typeof populateNotes>;
let mainNotesIds: ObjectId[];
let otherNotesIds: ObjectId[];
let user: UserSchema;
let user2: UserSchema;

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
    queryableUserBatchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      $pagination: {
                        last: 2,
                      },
                      _id: 1,
                      users: {
                        readOnly: 1,
                        createdAt: 1,
                      },
                      collabTexts: {
                        [TestCollabTextKey.TEXT]: {
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
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: [
                {
                  _id: mainNotesIds.at(-2),
                  users: [
                    {
                      createdAt: expect.any(Date),
                      readOnly: expect.any(Boolean),
                    },
                  ],
                  collabTexts: {
                    [TestCollabTextKey.TEXT]: {
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
                {
                  _id: mainNotesIds.at(-1),
                  users: [
                    {
                      createdAt: expect.any(Date),
                      readOnly: expect.any(Boolean),
                    },
                  ],
                  collabTexts: {
                    [TestCollabTextKey.TEXT]: {
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
              ],
            },
          },
        },
      },
    },
  ]);
});

it('loads many different paginations', async () => {
  function createLoadKey(
    categoryName: TestNoteCategory,
    pagination: RelayPagination<ObjectId>
  ): QueryableUserLoaderKey {
    return {
      id: {
        userId: user._id,
      },
      query: {
        notes: {
          category: {
            [categoryName]: {
              order: {
                items: {
                  $pagination: pagination,
                  _id: 1,
                },
              },
            },
          },
        },
      },
    };
  }

  function wrapUserNotes(categoryName: TestNoteCategory, userNotes: unknown) {
    return {
      notes: {
        category: {
          [categoryName]: {
            order: {
              items: userNotes,
            },
          },
        },
      },
    };
  }

  await expect(
    queryableUserBatchLoad(
      [
        createLoadKey(TestNoteCategory.MAIN, { first: 1 }), // 0
        createLoadKey(TestNoteCategory.OTHER, { last: 1 }), // 9
        createLoadKey(TestNoteCategory.OTHER, { first: 1 }), // 1
        createLoadKey(TestNoteCategory.MAIN, { last: 1 }), // 8
        createLoadKey(TestNoteCategory.OTHER, {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    queryableUserBatchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      $pagination: {
                        first: 1,
                      },
                      _id: 1,
                    },
                    firstId: 1,
                    lastId: 1,
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
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: [
                {
                  _id: mainNotesIds.at(0),
                },
              ],
              firstId: mainNotesIds.at(0),
              lastId: mainNotesIds.at(-1),
            },
          },
        },
      },
    },
  ]);
});

it('returns empty array for invalid path', async () => {
  await expect(
    queryableUserBatchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            notes: {
              category: {
                invalid_category: {
                  order: {
                    items: {
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
        },
      ],
      {
        global: context,
        request: undefined,
      }
    )
  ).resolves.toEqual([
    {
      notes: {
        category: {
          invalid_category: {
            order: {
              items: [],
            },
          },
        },
      },
    },
  ]);
});

it('loads all notes without pagination', async () => {
  await expect(
    queryableUserBatchLoad(
      [
        {
          id: {
            userId: user._id,
          },
          query: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      _id: 1,
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
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: mainNotesIds.map((id) => ({ _id: id })),
            },
          },
        },
      },
    },
  ]);
});

it('loads two users in a single db call', async () => {
  await expect(
    queryableUserBatchLoad(
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
