import { ApolloCache } from '@apollo/client';

import { generateLocalId } from '../../../utils/generate-local-id';
import { hasUserFragment } from '../signed-in-user/has-fragment';

export function generateSignedInUserId(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  for (let i = 0; i < 100; i++) {
    const id = generateLocalId();
    if (!hasUserFragment(id, cache)) {
      return id;
    }
  }

  throw new Error('Failed to generate id for User. This should never happend!');
}
