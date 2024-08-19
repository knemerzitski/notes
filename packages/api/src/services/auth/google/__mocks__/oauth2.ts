import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import { verifyCredentialToken as _verifyCredentialToken } from '../oauth2';

beforeEach(() => {
  mockReset(verifyCredentialToken);
});

export const verifyCredentialToken = mockFn<typeof _verifyCredentialToken>();
