import { Handler } from 'aws-lambda';

import 'source-map-support/register.js';
import { createLogger, Logger } from '../../utils/src/logging';

import { createAllIndexes, MongoDBCollections } from './mongodb/collections';
import { MongoDBContext } from './mongodb/context';
import { createDefaultMongoDBContext } from './parameters';
import { demoResetInterval, isDemoMode, runDemoJob } from './demo';

const TIER = process.env.MONGODB_TIER;
const hasAtlasSearch = TIER === 'enterprise';

const IS_DEMO_MODE = isDemoMode(process.env);
const DEMO_RESET_INTERVAL = demoResetInterval(process.env);

export interface CreateInitializeHandlerOptions {
  override?: {
    logger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
  };
}

export function createInitializeHandler(
  options?: CreateInitializeHandlerOptions
): Handler {
  let mongoDB: MongoDBContext<MongoDBCollections> | undefined;

  return async (event: unknown, context) => {
    const logger = options?.override?.logger ?? createLogger('initialize-handler');
    try {
      logger.info('started', {
        event,
        context,
      });

      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }

      logger.info('createAllIndexes');
      await createAllIndexes(mongoDB.collections, {
        searchIndexes: hasAtlasSearch,
      });

      await runDemoJob(
        IS_DEMO_MODE,
        {
          resetInterval: DEMO_RESET_INTERVAL,
        },
        {
          ...mongoDB,
          logger: logger.extend('demo'),
        }
      );

      return {
        statusCode: 200,
      };
    } catch (err) {
      logger.error('initialize', { err, event });
      throw err;
    }
  };
}

/**
 * Handler that should be run once after deployment.
 * Ensures indexes in MongoDB are created
 */
export const handler: Handler = createInitializeHandler();
