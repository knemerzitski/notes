import { HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AppContext } from './app-context';
import { GlobalRequestVariables } from '../types';

export function createHttpLinks(httpUri: string, appContext: Pick<AppContext, 'userId'>) {
  const httpLink = new HttpLink({
    uri: httpUri,
  });

  const headerUserIdLink = setContext((request, previousContext) => {
    const currentUserId = appContext.userId;
    if (!currentUserId) return previousContext;

    // USER_ID variable can be used in Query field keyArgs to separate same query for each user
    request.variables = {
      ...request.variables,
      [GlobalRequestVariables.USER_ID]: currentUserId,
    };

    return {
      ...previousContext,
      headers: {
        ...previousContext.headers,
        [CustomHeaderName.USER_ID]: currentUserId,
      },
    };
  });

  return {
    headerUserIdLink,
    httpLink,
  };
}
