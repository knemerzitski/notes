import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import { Logger } from '~utils/logging';

export interface MongoDBContextParams<TCollections> {
  uri: string;
  options?: MongoClientOptions;
  createCollectionInstances: (mongoDB: Db) => TCollections;
  logger: Logger;
}

export interface MongoDBContext<TCollections> {
  client: MongoClient;
  collections: TCollections;
}

export async function createMongoDBContext<TCollections>(
  params:
    | MongoDBContextParams<TCollections>
    | (() => Promise<MongoDBContextParams<TCollections>>)
): Promise<MongoDBContext<TCollections>> {
  if (typeof params === 'function') {
    params = await params();
  }

  params.logger.info('createMongoDBContext:connect', {
    uri: params.uri,
  });

  try {
    const client = new MongoClient(params.uri, params.options);

    const commandLogger = params.logger.extend('command');
    client.addListener('commandStarted', (e) => {
      commandLogger.info('commandStarted', e);
    });
    client.addListener('commandSucceeded', (e) => {
      commandLogger.info('commandSucceeded', e);
    });
    client.addListener('commandFailed', (e) => {
      commandLogger.error('commandFailed', e);
    });

    await client.connect();

    const db = client.db();

    const collections = params.createCollectionInstances(db);

    return {
      client,
      collections,
    };
  } catch (err) {
    params.logger.error('createMongoDBContext:connect', err);
    throw err;
  }
}
