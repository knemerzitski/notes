import { MongoClientOptions } from 'mongodb';
import { Connection, Schema, createConnection } from 'mongoose';

import { Logger } from '~common/logger';

export interface MongooseContextParams {
  uri: string;
  options?: MongoClientOptions;
  schema: Record<string, Schema>;
  logger: Logger;
}

export interface MongoDbContext {
  connection: Connection;
}

export async function createMongooseContext(
  params: MongooseContextParams | (() => Promise<MongooseContextParams>)
): Promise<MongoDbContext> {
  if (typeof params === 'function') {
    params = await params();
  }

  params.logger.info('buildMongoDbContext:createConnection', {
    uri: params.uri,
  });

  const newConn = createConnection(params.uri, params.options);

  try {
    const connection = await newConn.asPromise();

    Object.entries(params.schema).forEach(([name, schema]) =>
      connection.model(name, schema)
    );

    return {
      connection,
    };
  } catch (err) {
    params.logger.error('buildMongoDbContext:connect', err as Error);
    throw err;
  }
}
