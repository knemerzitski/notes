import { getOperationOrRequestUserId } from '../link/current-user';
import { GlobalOperationVariables } from '../types';

export function getOperationUserId(
  operation: Parameters<typeof getOperationOrRequestUserId>[0]
) {
  const userId = getOperationOrRequestUserId(operation);
  if (!userId) {
    throw new Error(
      `Operation is missing "${GlobalOperationVariables.USER_ID}" in variables`
    );
  }

  return userId;
}
