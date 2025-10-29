/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ObjectId } from 'mongodb';
import { beforeEach, expect, it } from 'vitest';

import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../__tests__/helpers/mongodb/instance';

import { populateNotes } from '../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../__tests__/helpers/mongodb/populate/populate-queue';
import { withTransaction } from '../mongodb/utils/with-transaction';

import { clearSeed } from './clear-seed';

import { SEED_DATA } from './seed-data';
import { seedIfNotExists } from './seed-if-not-exists';
import { runDemoJob } from './run-demo-job';

beforeEach(async () => {
  await Promise.all([
    resetDatabase(),
    Promise.all(['config'].map((name) => mongoClient.db().collection(name).deleteMany())),
  ]);
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
        demoId: 'user-alice-01',
        note: {
          categories: expect.any(Object),
        },
        profile: {
          displayName: 'Alice (Demo 1)',
          avatarColor: expect.any(String),
        },
      },
      {
        _id: expect.any(ObjectId),
        demoId: 'user-bob-02',
        note: {
          categories: expect.any(Object),
        },
        profile: {
          displayName: 'Bob (Demo 2)',
          avatarColor: expect.any(String),
        },
      },
    ])
  );

  await expect(
    mongoCollections.notes
      .find({
        demoId: 'note-alice-001',
      })
      .toArray()
  ).resolves.toEqual([
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
      demoId: 'note-alice-001',
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

it('resets seeded database', async () => {
  await runDemoJob(
    true,
    {
      resetInterval: 0,
    },
    {
      client: mongoClient,
      collections: mongoCollections,
    }
  );

  await expect(mongoCollections.users.find().toArray()).resolves.toHaveLength(3);

  await runDemoJob(
    true,
    {
      resetInterval: 0,
    },
    {
      client: mongoClient,
      collections: mongoCollections,
    }
  );

  await expect(mongoCollections.users.find().toArray()).resolves.toHaveLength(3);
});
