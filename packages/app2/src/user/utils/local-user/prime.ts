import { ApolloCache } from '@apollo/client';
import { hasLocalUser } from './has';
import { generateLocalUser } from './generate';
import { writeLocalUser } from './write';

/**
 * Generates a local SignedInUser and writes it to cache if it doesn't exist
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
