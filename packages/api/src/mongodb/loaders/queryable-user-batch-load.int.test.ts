/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, it, expect } from 'vitest';

import { resetDatabase, mongoCollections } from '../../__test__/helpers/mongodb/mongodb';
import {
  TestCollabTextKey,
  TestNoteCategory,
  populateNotes,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { RelayPagination } from '../pagination/relay-array-pagination';
import { UserSchema } from '../schema/user/user';

import {
  QueryableUserBatchLoadContext,
  QueryableUserLoadKey,
  queryableUserBatchLoad,
} from './queryable-user-batch-load';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;

let context: QueryableUserBatchLoadContext;

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
    note(noteIndex) {
      return {
        override: {
          publicId: `publicId_${noteIndex}`,
        },
      };
    },
    userNote(noteIndex) {
      return {
        override: {
          categoryName:
            noteIndex % 2 === 0 ? TestNoteCategory.MAIN : TestNoteCategory.OTHER,
        },
      };
    },
  });
  user = populateResult.user;

  await populateExecuteAll();

  context = {
    collections: mongoCollections,
  };
});

it('loads paginated notes', async () => {
  await expect(
    queryableUserBatchLoad(
      [
        {
          userId: user._id,
          userQuery: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      $pagination: {
                        last: 2,
                      },
                      $query: {
                        publicId: 1,
                        userNotes: {
                          $query: {
                            readOnly: 1,
                            isOwner: 1,
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
                                first: 2,
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
          },
        },
      ],
      context
    )
  ).resolves.toEqual([
    {
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: [
                {
                  publicId: 'publicId_6',
                  userNotes: [
                    {
                      isOwner: expect.any(Boolean),
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
                  publicId: 'publicId_8',
                  userNotes: [
                    {
                      isOwner: expect.any(Boolean),
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
  ): QueryableUserLoadKey {
    return {
      userId: user._id,
      userQuery: {
        notes: {
          category: {
            [categoryName]: {
              order: {
                items: {
                  $pagination: pagination,
                  $query: {
                    publicId: 1,
                  },
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
          after: populateResult.data.at(1)?.note!._id,
          first: 1,
        }), // 3
      ],
      context
    )
  ).resolves.toMatchObject([
    wrapUserNotes(TestNoteCategory.MAIN, [
      {
        publicId: 'publicId_0',
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        publicId: 'publicId_9',
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        publicId: 'publicId_1',
      },
    ]),
    wrapUserNotes(TestNoteCategory.MAIN, [
      {
        publicId: 'publicId_8',
      },
    ]),
    wrapUserNotes(TestNoteCategory.OTHER, [
      {
        publicId: 'publicId_3',
      },
    ]),
  ]);
});

it('loads firstId, lastId with pagination', async () => {
  await expect(
    queryableUserBatchLoad(
      [
        {
          userId: user._id,
          userQuery: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      $pagination: {
                        first: 1,
                      },
                      $query: {
                        _id: 1,
                        publicId: 1,
                      },
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
      context
    )
  ).resolves.toEqual([
    {
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: [
                {
                  _id: expect.any(ObjectId),
                  publicId: 'publicId_0',
                },
              ],
              firstId: expect.any(ObjectId),
              lastId: expect.any(ObjectId),
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
          userId: user._id,
          userQuery: {
            notes: {
              category: {
                invalid_category: {
                  order: {
                    items: {
                      $pagination: {
                        last: 2,
                      },
                      $query: {
                        _id: 1,
                      },
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
          userId: user._id,
          userQuery: {
            notes: {
              category: {
                [TestNoteCategory.MAIN]: {
                  order: {
                    items: {
                      $query: {
                        _id: 1,
                      },
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
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: [...new Array<undefined>(5)].map(() => ({
                _id: expect.any(ObjectId),
              })),
            },
          },
        },
      },
    },
  ]);
});
