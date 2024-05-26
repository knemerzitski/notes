import { useEffect } from 'react';

import useAddFetchResultErrorHandler from '../hooks/useAddFetchResultErrorHandler';
import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';
import { useApolloClient } from '@apollo/client';
import { getCurrentUserId } from '../../auth/hooks/useCurrentUserId';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

export default function ApolloClientErrorsSnackbarAlert() {
  const apolloClient = useApolloClient();
  const addHandler = useAddFetchResultErrorHandler();

  const showError = useSnackbarError();

  useEffect(() => {
    return addHandler(async (_value, firstError) => {
      const ignoreUnauthenticatedNoUser =
        firstError.extensions.code === GraphQLErrorCode.Unauthenticated &&
        !getCurrentUserId(apolloClient.cache);

      if (!ignoreUnauthenticatedNoUser) {
        showError(firstError.message);
      }

      return Promise.resolve(false);
    });
  }, [addHandler, showError, apolloClient]);

  return null;
}
