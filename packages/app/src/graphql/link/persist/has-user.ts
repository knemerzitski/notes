import { ApolloCache } from '@apollo/client';

import { getAllUserOngoingOperationsIds } from './get-all-user';

export function hasUserOngoingOperations(
  userIds: string[] | null,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  return getAllUserOngoingOperationsIds(userIds, cache).length > 0;
}
