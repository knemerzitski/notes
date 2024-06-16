import { Handler } from 'aws-lambda';
import 'source-map-support/register';
import { createLogger } from '~utils/logger';

import { createDefaultMongoDBContext } from './handler-params';
import { createAllIndexes } from './mongodb/collections';

/**
 * Handler that should be run once after deployment.
 * Ensures indexes in MongoDB are created
 */
export const handler: Handler = async (event: unknown, context: unknown) => {
  const logger = createLogger('initialize-handler');
  try {
    logger.info('started', {
      event,
      context,
    });

    const mongodb = await createDefaultMongoDBContext(logger);

    logger.info('createAllIndexes');
    await createAllIndexes(mongodb.collections);

    return {
      statusCode: 200,
    };
  } catch (err) {
    logger.error('initialize', err as Error, { event });
    throw err;
  }
};
