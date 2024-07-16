import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';
import useAddFetchResultErrorHandler from '../hooks/useAddFetchResultErrorHandler';
// import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
// import { getCurrentUserId } from '../../auth/user';

export default function ApolloClientErrorsSnackbarAlert() {
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
