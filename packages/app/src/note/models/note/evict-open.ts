import { ApolloCache } from '@apollo/client';

import { PublicUserNoteLink } from '../../../__generated__/graphql';

export function evictOpenedNote(
  publicUserNoteLinkId: PublicUserNoteLink['id'],
  cache: Pick<ApolloCache<unknown>, 'identify' | 'evict'>
) {
  cache.evict({
    id: cache.identify({
      __typename: 'PublicUserNoteLink',
      id: publicUserNoteLinkId,
    }),
    fieldName: 'open',
  });
}
