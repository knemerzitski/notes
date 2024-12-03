import { ApolloCache } from '@apollo/client';

import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';

export function clearExcludeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify'>
) {
  cache.evict({
    fieldName: 'excludeFromConnection',
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: getUserNoteLinkIdFromByInput(by, cache),
    }),
  });
}
