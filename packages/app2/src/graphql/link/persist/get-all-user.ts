import { ApolloCache } from '@apollo/client';
import { getAllOngoingOperations } from './get-all';
import { getOperationOrRequestUserId } from '../current-user';
import { isDefined } from '~utils/type-guards/is-defined';

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
        variables: JSON.parse(op.variables),
      });
      if (userId != null && userIds.includes(userId)) {
        return op.id;
      }
      return;
    })
    .filter(isDefined);
}
