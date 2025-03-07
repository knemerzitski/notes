import { faker } from '@faker-js/faker';
import { expect, it } from 'vitest';

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

import { createMongoDBLoaders } from '../../mongodb/loaders';

import { insertCollabRecord } from './insert-collab-record';

it('handles inserting records with total size larger than 16MiB', async () => {
  const TOTAL_PAYLOAD_SIZE = 20 * 1_000_000; // Total about 19MiB
  const RECORDS_COUNT = 16;

  const recordLength = TOTAL_PAYLOAD_SIZE / RECORDS_COUNT;

  faker.seed(3213);
  await resetDatabase();

  const user = fakeUserPopulateQueue();
  const { note } = fakeNotePopulateQueue(user, {
    collabText: {
      initialText: 'foo',
    },
  });
  userAddNote(user, note, {
    override: {
      readOnly: false,
    },
  });

  await populateExecuteAll();

  const loaders = createMongoDBLoaders({
    client: mongoClient,
    collections: mongoCollections,
  });

  let headRevision = note.collabText?.headText.revision ?? 1;
  function insertText(value: string) {
    return insertCollabRecord({
      mongoDB: {
        client: mongoClient,
        collections: mongoCollections,
        loaders,
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
