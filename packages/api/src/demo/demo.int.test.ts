import { beforeAll, expect, it } from 'vitest';
import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../__tests__/helpers/mongodb/instance';
import { ObjectId } from 'mongodb';
import { clearSeed } from './clear-seed';
import { populateNotes } from '../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../__tests__/helpers/mongodb/populate/populate-queue';
import { withTransaction } from '../mongodb/utils/with-transaction';
import { seedIfNotExists } from './seed-if-not-exists';
import { SEED_DATA } from './seed-data';
import { NoteCategory } from '../graphql/domains/types.generated';

beforeAll(async () => {
  await resetDatabase();
});

it('seed and clear', async () => {
  await withTransaction(mongoClient, ({ runSingleOperation }) =>
    seedIfNotExists(SEED_DATA, {
      runSingleOperation,
      client: mongoClient,
      collections: mongoCollections,
    })
  );

  await expect(mongoCollections.users.find().toArray()).resolves.toEqual(
    expect.arrayContaining([
      {
        _id: expect.any(ObjectId),
        demo: {
          id: 'demo-user-1',
        },
        note: {
          categories: {
            [NoteCategory.DEFAULT]: {
              noteIds: [expect.any(ObjectId)],
            },
          },
        },
        profile: {
          displayName: 'Demo Account 1',
        },
      },
      {
        _id: expect.any(ObjectId),
        demo: {
          id: 'demo-user-2',
        },
        note: {
          categories: {
            [NoteCategory.DEFAULT]: {
              noteIds: [expect.any(ObjectId)],
            },
          },
        },
        profile: {
          displayName: 'Demo Account 2',
        },
      },
    ])
  );

  await expect(mongoCollections.notes.find().toArray()).resolves.toEqual([
    {
      _id: expect.any(ObjectId),
      collabText: {
        headRecord: {
          revision: 1,
          text: expect.any(String),
        },
        tailRecord: {
          revision: 1,
          text: expect.any(String),
        },
        updatedAt: expect.any(Date),
      },
      demo: {
        id: 'demo-note-1',
      },
      users: [
        {
          _id: expect.any(ObjectId),
          categoryName: 'DEFAULT',
          createdAt: expect.any(Date),
          isOwner: true,
        },
        {
          _id: expect.any(ObjectId),
          categoryName: 'DEFAULT',
          createdAt: expect.any(Date),
          isOwner: false,
        },
      ],
    },
  ]);

  // Ensure other notes and users stay unaffected
  populateNotes(1);
  await populateExecuteAll();

  await withTransaction(mongoClient, ({ runSingleOperation }) =>
    clearSeed({
      runSingleOperation,
      client: mongoClient,
      collections: mongoCollections,
    })
  );

  await expect(mongoCollections.users.find().toArray()).resolves.toHaveLength(1);
  await expect(mongoCollections.notes.find().toArray()).resolves.toHaveLength(1);
});
