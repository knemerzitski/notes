import { ApolloCache } from '@apollo/client';

import { isDefined } from '../../../../../utils/src/type-guards/is-defined';

import { findOperationUserIds } from '../../utils/find-operation-user-id';

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
      const opUserIds = findOperationUserIds({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        query: JSON.parse(op.query),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables: JSON.parse(op.variables),
      });
      if (opUserIds.length === 0) {
        return;
      }

      if (userIds.some((userId) => opUserIds.includes(userId))) {
        return op.id;
      }

      return;
    })
    .filter(isDefined);
}
