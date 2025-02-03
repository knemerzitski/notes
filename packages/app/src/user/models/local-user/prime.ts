import { ApolloCache } from '@apollo/client';

import { generateLocalUser } from './generate';
import { hasLocalUser } from './has';
import { writeLocalUser } from './write';

/**
 * Generates a local User and writes it to cache if it doesn't exist
 */
export function primeLocalUser(
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'writeQuery' | 'readFragment' | 'identify'
  >
) {
  if (hasLocalUser(cache)) {
    return;
  }

  const localUser = generateLocalUser(cache);

  writeLocalUser(localUser, cache);

  return localUser;
}
