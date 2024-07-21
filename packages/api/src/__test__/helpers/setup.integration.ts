import { faker } from '@faker-js/faker';
import { afterAll, beforeAll } from 'vitest';

import { createAllIndexes } from '../../mongodb/collections';

import { mongoClient, mongoCollections } from './mongodb/mongodb';

beforeAll(async () => {
  faker.seed(125);
  await createAllIndexes(mongoCollections);
});

afterAll(async () => {
  await mongoClient.close();
});
