/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ObjectId } from 'mongodb';
import { assert, beforeEach, expect, it } from 'vitest';

import { Changeset, Selection } from '../../../collab/src';
import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../__tests__/helpers/mongodb/instance';

import { populateNotes } from '../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../__tests__/helpers/mongodb/populate/populate-queue';
import { NoteCategory } from '../graphql/domains/types.generated';
import { notesArrayPath } from '../mongodb/models/user/utils/notes-array-path';
import { DBUserSchema } from '../mongodb/schema/user';
import { withTransaction } from '../mongodb/utils/with-transaction';

import { clearSeed } from './clear-seed';

import { runDemoJob } from './run-demo-job';
import { SEED_DATA } from './seed-data';
import { seedIfNotExists } from './seed-if-not-exists';

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

it('unlinks demo user from normal note, record author replaced with owner', async () => {
  await withTransaction(mongoClient, ({ runSingleOperation }) =>
    seedIfNotExists(SEED_DATA, {
      runSingleOperation,
      client: mongoClient,
      collections: mongoCollections,
    })
  );

  const demoUser = await mongoCollections.users.findOne<DBUserSchema>({
    demoId: {
      $exists: true,
    },
  });
  assert(demoUser != null);

  const normal = populateNotes(1);
  await populateExecuteAll();

  const normalUser = normal.user;
  const normalNote = normal.data[0]!.note;

  await mongoCollections.users.updateOne(
    {
      _id: demoUser._id,
    },
    {
      $push: {
        [notesArrayPath(NoteCategory.DEFAULT)]: normalNote._id,
      },
    }
  );
  await mongoCollections.notes.updateOne(
    {
      _id: normalNote._id,
    },
    {
      $push: {
        users: {
          _id: demoUser._id,
          isOwner: false,
          categoryName: NoteCategory.DEFAULT,
          createdAt: new Date(),
        },
      },
    }
  );

  const recordId = new ObjectId();
  await mongoCollections.collabRecords.insertOne({
    _id: recordId,
    authorId: demoUser._id,
    collabTextId: normalNote._id,
    changeset: Changeset.EMPTY.serialize(),
    createdAt: new Date(),
    idempotencyId: '123',
    inverse: Changeset.EMPTY.serialize(),
    revision: 9,
    selection: Selection.ZERO.serialize(),
    selectionInverse: Selection.ZERO.serialize(),
  });

  await withTransaction(mongoClient, ({ runSingleOperation }) =>
    clearSeed({
      runSingleOperation,
      client: mongoClient,
      collections: mongoCollections,
    })
  );

  await expect(mongoCollections.notes.find().toArray()).resolves.toEqual([
    {
      _id: normalNote._id,
      collabText: {
        headRecord: {
          revision: 1,
          text: expect.any(String),
        },
        tailRecord: {
          revision: 0,
          text: expect.any(String),
        },
        updatedAt: expect.any(Date),
      },
      shareLinks: expect.any(Array),
      users: [
        {
          _id: normalUser._id,
          categoryName: expect.any(String),
          createdAt: expect.any(Date),
          isOwner: true,
          preferences: expect.any(Object),
          readOnly: expect.any(Boolean),
        },
      ],
    },
  ]);

  await expect(
    mongoCollections.collabRecords.findOne({
      _id: recordId,
    })
  ).resolves.toEqual({
    _id: recordId,
    authorId: normalUser._id,
    collabTextId: normalNote._id,
    changeset: Changeset.EMPTY.serialize(),
    createdAt: expect.any(Date),
    idempotencyId: '123',
    inverse: Changeset.EMPTY.serialize(),
    revision: 9,
    selection: Selection.ZERO.serialize(),
    selectionInverse: Selection.ZERO.serialize(),
  });
});
