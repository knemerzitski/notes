import { MongoClient } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { SEED_DATA } from './seed-data';
import { seedIfNotExists } from './seed-if-not-exists';
import { withTransaction } from '../mongodb/utils/with-transaction';
import { clearSeed } from './clear-seed';
import { ConfigModel } from './config-model';
import { Logger } from '../../../utils/src/logging';

type Context = {
  client: MongoClient;
  collections: Pick<
    MongoDBCollections,
    CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
  >;
  logger?: Logger;
};

/**
 *
 * Seeds or clears database with demo data.
 *
 * If {@link isDemoEnabled} is true then database is seeded otherwise its cleared.
 *
 * If resetInterval has elapsed then database is reset back to initial demo data.
 *
 */
export async function runDemoJob(
  isDemoEnabled: boolean,
  options: {
    resetInterval: number;
  },
  ctx: Context
) {
  ctx.logger?.debug('Running demo job');

  const config = await ConfigModel.create(ctx.client.db(), {
    resetInterval: options.resetInterval,
  });

  if (isDemoEnabled) {
    ctx.logger?.debug('Enabling DEMO');
    await enableDemo(config, ctx);
  } else {
    ctx.logger?.debug('Disabling DEMO');
    await disableDemo(config, ctx);
  }

   ctx.logger?.debug('Demo job completed');
}

async function enableDemo(config: ConfigModel, ctx: Context) {
  const now = new Date();

  const isSeeded = config.isDatabaseSeeded();
  const isSeedExpired = isSeeded && config.getResetAt() <= now;
  const seedDatabase = !isSeeded || isSeedExpired;

  if (!isSeedExpired && !seedDatabase) {
    ctx.logger?.debug('Database is already seeded and not expired. All OK.');
    // Database is already seeded with demo data
    return;
  }

  await withTransaction(ctx.client, async ({ runSingleOperation }) => {
    if (isSeedExpired) {
      ctx.logger?.debug(
        '"resetAt" has elapsed. Clearing database from seeded demo data',
        {
          now,
          resetAt: config.getResetAt(),
        }
      );
      await clearSeed({
        ...ctx,
        runSingleOperation,
      });
      config.refreshResetAt();
    }

    if (seedDatabase) {
      ctx.logger?.debug('Seeding database with fresh data');
      await Promise.all([
        seedIfNotExists(SEED_DATA, { ...ctx, runSingleOperation }),
        runSingleOperation((session) => config.save(session)),
      ]);
    }
  });
}

async function disableDemo(config: ConfigModel, ctx: Context) {
  if (!config.isDatabaseSeeded()) {
    ctx.logger?.debug('Database has no demo data. All OK.');
    return;
  }

  await withTransaction(ctx.client, async ({ runSingleOperation }) => {
    ctx.logger?.debug('Clearing database from seeded demo data along with config');
    await Promise.all([
      clearSeed({
        ...ctx,
        runSingleOperation,
      }),
      runSingleOperation((session) => config.delete(session)),
    ]);
  });
}
