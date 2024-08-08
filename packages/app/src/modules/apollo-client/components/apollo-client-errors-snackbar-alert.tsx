import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { useSnackbarError } from '../../common/components/snackbar-alert-provider';
import { useAddFetchResultErrorHandler } from '../hooks/use-add-fetch-result-error-handler';
// import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
// import { getCurrentUserId } from '../../auth/user';

export function ApolloClientErrorsSnackbarAlert() {
  const apolloClient = useApolloClient();
  const addHandler = useAddFetchResultErrorHandler();

  const showError = useSnackbarError();

  useEffect(() => {
    return addHandler((_value, firstError) => {
      showError(firstError.message);
    });
  }, [addHandler, showError, apolloClient]);

  return null;
}
