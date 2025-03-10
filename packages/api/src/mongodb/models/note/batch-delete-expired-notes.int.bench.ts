import { faker } from '@faker-js/faker';
import { bench, describe } from 'vitest';

import {
  mongoClient,
  mongoCollections,
  resetDatabase,
} from '../../../__tests__/helpers/mongodb/instance';
import { TestNoteCategory } from '../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';

import { generateTrashedNotes } from '../../../__tests__/helpers/mongodb/populate/trashed-notes';

import { batchDeleteExpiredNotes } from './batch-delete-expired-notes';

async function rootBeforeBench() {
  faker.seed(213134);
  await resetDatabase();
}

describe('medium data set', () => {
  async function beforeBench() {
    await rootBeforeBench();

    generateTrashedNotes({
      trashCategory: TestNoteCategory.OTHER,
      nUsers: 20,
      nNotes: 3000,
      trashedChance: 0.97,
      expiredChance: 0.8,
      otherUserOwnerChance: 0.02,
      sharedChanceTable: {
        0.05: 5,
        0.2: 2,
        0.4: 1,
        1: 0,
      },
    });
    await populateExecuteAll();
  }

  bench('batch 400', async () => {
    await beforeBench();

    await batchDeleteExpiredNotes({
      mongoDB: {
        client: mongoClient,
        collections: mongoCollections,
      },
      trashCategoryName: TestNoteCategory.OTHER,
      batchSize: 400,
    });
  });

  bench('batch 1000', async () => {
    await beforeBench();

    await batchDeleteExpiredNotes({
      mongoDB: {
        client: mongoClient,
        collections: mongoCollections,
      },
      trashCategoryName: TestNoteCategory.OTHER,
      batchSize: 1000,
    });
  });
});
