import { ApolloCache } from '@apollo/client';

import { isDefined } from '~utils/type-guards/is-defined';

import { getOperationOrRequestUserId } from '../current-user';

import { getAllOngoingOperations } from './get-all';

export function getAllUserOngoingOperationsIds(
  userIds: string[] | null,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  if (userIds == null) {
    return getAllOngoingOperations(cache).map((op) => op.id);
  }

  return getAllOngoingOperations(cache)
    .map((op) => {
      const userId = getOperationOrRequestUserId({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables: JSON.parse(op.variables),
      });
      if (userId != null && userIds.includes(userId)) {
        return op.id;
      }
      return;
    })
    .filter(isDefined);
}
