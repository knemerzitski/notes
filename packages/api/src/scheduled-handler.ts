import { Handler } from 'aws-lambda';

import 'source-map-support/register.js';
import { createLogger, Logger } from '../../utils/src/logging';

import { NoteCategory } from './graphql/domains/types.generated';
import { MongoDBCollections } from './mongodb/collections';
import { MongoDBContext } from './mongodb/context';
import { batchDeleteExpiredNotes } from './mongodb/models/note/batch-delete-expired-notes';
import { createDefaultMongoDBContext } from './parameters';
import { isEnvironmentVariableTruthy } from '../../utils/src/string/is-environment-variable-truthy';
import { runDemoResetJob } from './demo';

const IS_DEMO_MODE = isEnvironmentVariableTruthy(process.env.DEMO);

export interface CreateScheduledHandlerOptions {
  override?: {
    logger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
  };
}

export function createScheduledHandler(options?: CreateScheduledHandlerOptions): Handler {
  let mongoDB: MongoDBContext<MongoDBCollections> | undefined;

  return async (event: unknown, context) => {
    const logger = options?.override?.logger ?? createLogger('scheduled-handler');
    try {
      logger.info('started', {
        event,
        context,
      });

      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }

      logger.info('batchDeleteExpiredNotes');
      const millisMargin = 50;
      let prevMillisRemaining = context.getRemainingTimeInMillis();
      await batchDeleteExpiredNotes({
        mongoDB,
        trashCategoryName: NoteCategory.TRASH,
        batchSize: 5000,
        silentErrors: true,
        onStatus(info) {
          logger.info('status', info);
          const millisRemaining = context.getRemainingTimeInMillis();
          const millisUsed = prevMillisRemaining - millisRemaining;
          prevMillisRemaining = millisRemaining;

          if (millisRemaining - millisMargin <= millisUsed) {
            logger.info('Running out of time, interruping...');
            return {
              signal: 'interrupt',
            };
          }

          return {
            signal: 'proceed',
          };
        },
        maxConcurrentTransactions: 1,
        logger,
      });

      if (IS_DEMO_MODE) {
        logger.info('runDemoResetJob');
        await runDemoResetJob(mongoDB);
      }

      return {
        statusCode: 200,
      };
    } catch (err) {
      logger.error('scheduled', { err, event });
      throw err;
    }
  };
}

/**
 * Handler that runs background tasks on a schedule
 */
export const handler: Handler = createScheduledHandler();
