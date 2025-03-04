import waitPort from 'wait-port';

import { Logger } from '../../../utils/src/logging';

export async function waitForMongoDBPort(uri: string, logger: Logger) {
  logger.info('waitForMongoDBPort', 'Connecting...');
  const uriUrl = new URL(uri);
  const { open } = await waitPort({
    host: uriUrl.hostname,
    port: Number(uriUrl.port),
    path: uriUrl.pathname,
    timeout: 10000,
    output: 'silent',
  });
  if (!open) {
    throw new Error(`MongoDB server is not reachable on uri "${uri}"`);
  }

  logger.info('waitForMongoDBPort', `Connected "${uri}"`);
}
