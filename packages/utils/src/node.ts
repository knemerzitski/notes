import { Logger } from './logging';

export function logNodeInfo(logger: Pick<Logger, 'info'>) {
  logger.info('Environment', {
    nodeVersion: process.version,
    NODE_ENV: process.env.NODE_ENV ?? '<undefined>',
  });
}
