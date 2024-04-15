import { afterAll, beforeAll } from 'vitest';

import { mongoClient, mongoCollections } from './mongodb';
import { createAllIndexes } from '../../mongodb/collections';
import { faker } from '@faker-js/faker';

beforeAll(async () => {
  faker.seed(125);
  await createAllIndexes(mongoCollections);
});

afterAll(async () => {
  await mongoClient.close();
});
