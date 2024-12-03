import { ApolloCache } from '@apollo/client';

import { generateLocalId } from '../../../utils/generate-local-id';
import { hasNoteFragment } from '../note/has-fragment';

export function generateNoteId(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  for (let i = 0; i < 100; i++) {
    const id = generateLocalId();
    if (!hasNoteFragment(id, cache)) {
      return id;
    }
  }

  throw new Error('Failed to generate id for Note. This should never happend!');
}
