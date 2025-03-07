import { createMongoDBContext } from './mongodb';

export const { mongoClient, mongoDB, mongoCollections, resetDatabase } =
  await createMongoDBContext();
