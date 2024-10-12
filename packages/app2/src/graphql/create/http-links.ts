import { HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AppContext, GlobalRequestVariables } from '../types';
import { isLocalId } from '../../utils/is-local-id';

export function createHttpLinks(httpUri: string, appContext: Pick<AppContext, 'userId'>) {
  const httpLink = new HttpLink({
    uri: httpUri,
  });

  const headerUserIdLink = setContext((request, previousContext) => {
    const userId = appContext.userId;
    if (!userId || isLocalId(userId)) return previousContext;

    // USER_ID variable can be used in Query field keyArgs to separate same query for each user
    request.variables = {
      ...request.variables,
      [GlobalRequestVariables.USER_ID]: userId,
    };

    return {
      ...previousContext,
      headers: {
        ...previousContext.headers,
        [CustomHeaderName.USER_ID]: userId,
      },
    };
  });

  return {
    headerUserIdLink,
    httpLink,
  };
}
