import { ApolloCache } from '@apollo/client';

import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';

export function clearHideInList(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify'>
) {
  cache.evict({
    fieldName: 'hiddenInList',
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: getUserNoteLinkIdFromByInput(by, cache),
    }),
  });
}
