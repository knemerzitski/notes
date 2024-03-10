import { OAuth2Client } from 'google-auth-library';

import isTruthy from '~utils/isTruthy';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const MOCK =
  process.env.NODE_ENV === 'production'
    ? false
    : isTruthy(process.env.VITE_MOCK_GOOGLE_AUTH);

interface Result {
  id: string;
  name: string;
  email: string;
}

/**
 * Verifies token received from client.
 * @returns Unique Google user ID and name
 */
export async function verifyCredentialToken(token: string): Promise<Result> {
  if (MOCK) return mockVerifyCredentialToken(token);

  const client = new OAuth2Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });
  const ticket = await client.verifyIdToken({
    idToken: token,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Unexpected empty OAuth payload');
  }
  return {
    id: payload.sub,
    name: payload.name ?? 'Anonymous',
    email: payload.email ?? 'anonymous@unknown',
  };
}

function mockVerifyCredentialToken(token: string): Result {
  return JSON.parse(token) as Result;
}
