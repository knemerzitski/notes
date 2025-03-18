/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { Changeset } from '../../../../collab/src/changeset';

import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../__tests__/helpers/mongodb/populate/user';

import { createMongoDBLoaders, MongoDBLoaders } from '../../mongodb/loaders';

import { insertCollabRecord } from './insert-collab-record';
import { DBUserSchema } from '../../mongodb/schema/user';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { DBCollabRecordSchema } from '../../mongodb/schema/collab-record';
import { ObjectId } from 'mongodb';

let user: DBUserSchema;
let note: DBNoteSchema;
let collabRecords: DBCollabRecordSchema[];
let mongoDBLoaders: MongoDBLoaders;

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  mongoDBLoaders = createMongoDBLoaders({
    client: mongoClient,
    collections: mongoCollections,
  });

  user = fakeUserPopulateQueue();
  ({ note, collabRecords } = fakeNotePopulateQueue(user, {
    collabText: {
      initialText: 'foo',
    },
  }));
  userAddNote(user, note, {
    override: {
      readOnly: false,
    },
  });

  await populateExecuteAll();

  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('updates openNote with new selection when it exists', async () => {
  const connectionId = 'fooConnectionId';

  let headRevision = note.collabText!.headText.revision;

  await mongoCollections.openNotes.insertOne({
    expireAt: faker.date.future(),
    noteId: note._id,
    userId: user._id,
    collabText: {
      revision: headRevision,
      latestSelection: collabRecords.at(-1)!.afterSelection,
    },
    clients: [
      {
        connectionId,
        subscriptionId: 'random',
      },
    ],
  });

  // Mock Date
  vi.setSystemTime(faker.date.soon());
  const now = Date.now();
  const openNoteDuration = 60 * 1111;
  const openNoteDate = new Date(now + openNoteDuration);

  await insertCollabRecord({
    mongoDB: {
      client: mongoClient,
      collections: mongoCollections,
      loaders: mongoDBLoaders,
    },
    noteId: note._id,
    userId: user._id,
    maxRecordsCount: 1_000_000,
    insertRecord: {
      changeset: Changeset.fromInsertion('footext'),
      revision: headRevision++,
      afterSelection: {
        start: 2,
        end: 3,
      },
      beforeSelection: {
        start: 0,
        end: 0,
      },
      userGeneratedId: faker.string.nanoid(),
    },
    connectionId,
    openNoteDuration,
  });

  await expect(mongoCollections.openNotes.findOne()).resolves.toEqual({
    _id: expect.any(ObjectId),
    clients: [
      {
        connectionId: 'fooConnectionId',
        subscriptionId: 'random',
      },
    ],
    collabText: {
      latestSelection: {
        end: 3,
        start: 2,
      },
      revision: 2,
    },
    expireAt: openNoteDate,
    noteId: note._id,
    userId: user._id,
  });
});

it('handles inserting records with total size larger than 16MiB', async () => {
  const TOTAL_PAYLOAD_SIZE = 20 * 1_000_000; // Total about 19MiB
  const RECORDS_COUNT = 16;

  const recordLength = TOTAL_PAYLOAD_SIZE / RECORDS_COUNT;

  let headRevision = note.collabText?.headText.revision ?? 1;
  function insertText(value: string) {
    return insertCollabRecord({
      mongoDB: {
        client: mongoClient,
        collections: mongoCollections,
        loaders: mongoDBLoaders,
      },
      noteId: note._id,
      userId: user._id,
      maxRecordsCount: 1_000_000,
      insertRecord: {
        changeset: Changeset.fromInsertion(value),
        revision: headRevision++,
        afterSelection: {
          start: 0,
          end: 0,
        },
        beforeSelection: {
          start: 0,
          end: 0,
        },
        userGeneratedId: faker.string.nanoid(),
      },
    });
  }

  await expect(
    (async () => {
      for (let i = 0; i < RECORDS_COUNT; i++) {
        await insertText('a'.repeat(recordLength));
      }
      return true;
    })()
  ).resolves.toStrictEqual(true);
});
