import { Handler } from 'aws-lambda';

import 'source-map-support/register';
import { createLogger, Logger } from '~utils/logging';

import { createDefaultMongoDBContext } from './parameters';
import { createAllIndexes } from './mongodb/collections';

const TIER = process.env.MONGODB_TIER;
const hasAtlasSearch = TIER === 'enterprise';

export interface CreateInitializeHandlerOptions {
  override?: {
    logger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
  };
}

export function createInitializeHandler(
  options?: CreateInitializeHandlerOptions
): Handler {
  return async (event: unknown, context: unknown) => {
    const logger = options?.override?.logger ?? createLogger('initialize-handler');
    try {
      logger.info('started', {
        event,
        context,
      });

      const mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
        createDefaultMongoDBContext(logger));

      logger.info('createAllIndexes');
      await createAllIndexes(mongoDB.collections, {
        searchIndexes: hasAtlasSearch,
      });

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
