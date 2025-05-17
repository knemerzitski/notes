import '../../../../collab2/src/__tests__/helpers/inspect';

import { faker } from '@faker-js/faker';
import { beforeAll } from 'vitest';
import './extend';

beforeAll(() => {
  faker.seed(124);
});
