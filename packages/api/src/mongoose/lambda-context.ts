import { Connection, createConnection, ConnectOptions } from 'mongoose';

import { Logger } from '~utils/logger';

export interface MongooseContextParams<TModels> {
  uri: string;
  options?: ConnectOptions;
  createModels: (connection: Connection) => TModels;
  logger: Logger;
}

export interface MongoDbContext<TModels> {
  connection: Connection;
  model: TModels;
}

export async function createMongooseContext<TModels>(
  params: MongooseContextParams<TModels> | (() => Promise<MongooseContextParams<TModels>>)
): Promise<MongoDbContext<TModels>> {
  if (typeof params === 'function') {
    params = await params();
  }

  params.logger.info('buildMongoDbContext:createConnection', {
    uri: params.uri,
  });

  const newConn = createConnection(params.uri, params.options);

  try {
    const connection = await newConn.asPromise();

    return {
      connection,
      model: params.createModels(connection),
    };
  } catch (err) {
    params.logger.error('buildMongoDbContext:connect', err as Error);
    throw err;
  }
}
