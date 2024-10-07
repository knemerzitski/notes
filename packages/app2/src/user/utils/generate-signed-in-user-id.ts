import { ApolloCache } from '@apollo/client';
import { generateLocalId } from '../../utils/generate-local-id';
import { hasSignedInUser } from './signed-in-user';

export function generateSignedInUserId(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  for (let i = 0; i < 100; i++) {
    const id = generateLocalId();
    if (!hasSignedInUser(id, cache)) {
      return id;
    }
  }

  throw new Error('Failed to generate id for SignedInUser. This should never happend!');
}
