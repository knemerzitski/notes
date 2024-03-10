import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import { parseAuthFromHeaders as _getSessionUserFromHeaders } from '../auth-context';

beforeEach(() => {
  mockReset(getSessionUserFromHeaders);
});

export const getSessionUserFromHeaders = mockFn<typeof _getSessionUserFromHeaders>();
