import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import { getSessionUserFromHeaders as _getSessionUserFromHeaders } from '../parse-cookies';

beforeEach(() => {
  mockReset(getSessionUserFromHeaders);
});

export const getSessionUserFromHeaders = mockFn<typeof _getSessionUserFromHeaders>();
