import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach } from 'vitest';

import { resetDatabase } from './mongoose';

beforeAll(() => {
  faker.seed(123);
});

beforeEach(async () => {
  await resetDatabase();
});
