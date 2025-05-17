/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { Changeset, Selection } from '../../../../collab2/src';

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

import { DBCollabRecordSchema } from '../../mongodb/schema/collab-record';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { DBUserSchema } from '../../mongodb/schema/user';

import { insertCollabRecord } from './insert-collab-record';

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
      latestSelection: collabRecords.at(-1)!.selection,
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
      changeset: Changeset.fromText('footext', 3),
      revision: headRevision++,
      selection: Selection.create(2, 3),
      selectionInverse: Selection.ZERO,
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
      latestSelection: Selection.create(2, 3).serialize(),
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
  function insertText(value: string, inputLength: number) {
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
        userGeneratedId: faker.string.nanoid(),
        revision: headRevision++,
        changeset: Changeset.fromText(value, inputLength),
        selectionInverse: Selection.ZERO,
        selection: Selection.ZERO,
      },
    });
  }

  await expect(
    (async () => {
      let inputLength = 3;
      for (let i = 0; i < RECORDS_COUNT; i++) {
        await insertText('a'.repeat(recordLength), inputLength);
        inputLength = recordLength;
      }
      return true;
    })()
  ).resolves.toStrictEqual(true);
});
