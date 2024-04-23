import { MongoClient } from 'mongodb';
import { CollectionName, createCollectionInstances } from '../../mongodb/collections';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.TEST_MONGODB_URI!;

export const mongoClient = new MongoClient(DB_URI);
await mongoClient.connect();

export const mongoDB = mongoClient.db();

export const mongoCollections = createCollectionInstances(mongoDB);

export function resetDatabase() {
  return Promise.all(
    Object.values(CollectionName).map((name) => mongoCollections[name].deleteMany())
  );
}