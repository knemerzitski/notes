import { faker } from '@faker-js/faker';
import { beforeEach, expect, it } from 'vitest';

import {
  mongoClient,
  mongoCollections,
  resetDatabase,
 mongoCollectionStats } from '../../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../../__tests__/helpers/mongodb/populate/note';
import {
  TestNoteCategory,
  userAddNote,
} from '../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';

import { fakeUserPopulateQueue } from '../../../__tests__/helpers/mongodb/populate/user';

import { batchDeleteExpiredNotes } from './batch-delete-expired-notes';

beforeEach(async () => {
  faker.seed(876876);
  await resetDatabase();
});

it('does not modify note user with no expireAt', async () => {
  const user = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(user, {
    override: {
      users: [
        {
          trashed: undefined,
        },
      ],
    },
  });
  userAddNote(user, note);
  await populateExecuteAll();
  mongoCollectionStats.mockClear();

  await batchDeleteExpiredNotes({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
    },
    trashCategoryName: TestNoteCategory.MAIN,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toStrictEqual(note);

  await expect(
    mongoCollections.users.findOne({
      _id: user._id,
    })
  ).resolves.toStrictEqual(user);

  await expect(mongoCollections.collabRecords.find().toArray()).resolves.toHaveLength(1);
});

it('does not modify note user with future expireAt', async () => {
  const user = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(user, {
    override: {
      users: [
        {
          trashed: {
            expireAt: new Date(Date.now() + 1000 * 60),
          },
        },
      ],
    },
  });
  userAddNote(user, note);
  await populateExecuteAll();
  mongoCollectionStats.mockClear();

  await batchDeleteExpiredNotes({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
    },
    trashCategoryName: TestNoteCategory.MAIN,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toStrictEqual(note);

  await expect(
    mongoCollections.users.findOne({
      _id: user._id,
    })
  ).resolves.toStrictEqual(user);

  await expect(mongoCollections.collabRecords.find().toArray()).resolves.toHaveLength(1);
});

it('deletes note completely when owner has expired link', async () => {
  const ownerUser = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(ownerUser);

  userAddNote(ownerUser, note, {
    override: {
      trashed: {
        expireAt: new Date(Date.now() - 1000 * 60),
      },
    },
  });
  const otherUser = fakeUserPopulateQueue();
  userAddNote(otherUser, note, {
    override: {
      isOwner: false,
    },
  });

  await populateExecuteAll();
  mongoCollectionStats.mockClear();

  await batchDeleteExpiredNotes({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
    },
    trashCategoryName: TestNoteCategory.MAIN,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toStrictEqual(null);

  await expect(
    mongoCollections.users
      .findOne({
        _id: ownerUser._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(0);

  await expect(
    mongoCollections.users
      .findOne({
        _id: otherUser._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(0);

  await expect(mongoCollections.collabRecords.find().toArray()).resolves.toHaveLength(0);
});

it('unlinks note when other user has expired link', async () => {
  const ownerUser = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(ownerUser);

  userAddNote(ownerUser, note);
  const otherUser = fakeUserPopulateQueue();
  userAddNote(otherUser, note, {
    override: {
      isOwner: false,
      trashed: {
        expireAt: new Date(Date.now() - 1000 * 60),
      },
    },
  });

  await populateExecuteAll();
  mongoCollectionStats.mockClear();

  await batchDeleteExpiredNotes({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
    },
    trashCategoryName: TestNoteCategory.MAIN,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toStrictEqual({
    ...note,
    users: note.users.filter((user) => !user._id.equals(otherUser._id)),
  });

  await expect(
    mongoCollections.users
      .findOne({
        _id: ownerUser._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(1);

  await expect(
    mongoCollections.users
      .findOne({
        _id: otherUser._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(0);

  await expect(mongoCollections.collabRecords.find().toArray()).resolves.toHaveLength(1);
});

it('unlinks owner expired note if have 2 owners', async () => {
  const ownerUser = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(ownerUser);

  userAddNote(ownerUser, note);
  const ownerUser2 = fakeUserPopulateQueue();
  userAddNote(ownerUser2, note, {
    override: {
      isOwner: true,
      trashed: {
        expireAt: new Date(Date.now() - 1000 * 60),
      },
    },
  });

  await populateExecuteAll();
  mongoCollectionStats.mockClear();

  await batchDeleteExpiredNotes({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
    },
    trashCategoryName: TestNoteCategory.MAIN,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toStrictEqual({
    ...note,
    users: note.users.filter((user) => !user._id.equals(ownerUser2._id)),
  });

  await expect(
    mongoCollections.users
      .findOne({
        _id: ownerUser._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(1);

  await expect(
    mongoCollections.users
      .findOne({
        _id: ownerUser2._id,
      })
      .then((user) => user?.note.categories[TestNoteCategory.MAIN]?.noteIds)
  ).resolves.toHaveLength(0);

  await expect(mongoCollections.collabRecords.find().toArray()).resolves.toHaveLength(1);
});
