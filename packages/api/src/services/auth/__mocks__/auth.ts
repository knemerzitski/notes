import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import { parseAuthenticationContextFromHeaders as _parseAuthenticationContextFromHeaders } from '../auth';

beforeEach(() => {
  mockReset(parseAuthenticationContextFromHeaders);
});

export const parseAuthenticationContextFromHeaders =
  mockFn<typeof _parseAuthenticationContextFromHeaders>();
