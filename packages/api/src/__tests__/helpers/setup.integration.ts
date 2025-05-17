import '../../../../collab2/src/__tests__/helpers/inspect';

import { faker } from '@faker-js/faker';
import { afterAll, beforeAll } from 'vitest';

import { createAllIndexes } from '../../mongodb/collections';

import { mongoClient, mongoCollections } from './mongodb/instance';
import './extend';

beforeAll(async () => {
  faker.seed(125);
  await createAllIndexes(mongoCollections);
});

afterAll(async () => {
  await mongoClient.close();
});
