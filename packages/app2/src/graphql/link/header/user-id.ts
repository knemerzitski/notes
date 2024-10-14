import { setContext } from '@apollo/client/link/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { getOperationOrRequestUserId } from '../current-user';

export const headerUserIdLink = setContext((request, previousContext) => {
  const userId = getOperationOrRequestUserId(request);
  if (!userId) return previousContext;

  return {
    ...previousContext,
    headers: {
      ...previousContext.headers,
      [CustomHeaderName.USER_ID]: userId,
    },
  };
});
