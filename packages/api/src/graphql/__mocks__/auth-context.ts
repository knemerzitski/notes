import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import { parseAuthFromHeaders as _parseAuthFromHeaders } from '../auth-context';

beforeEach(() => {
  mockReset(parseAuthFromHeaders);
});

export const parseAuthFromHeaders = mockFn<typeof _parseAuthFromHeaders>();
