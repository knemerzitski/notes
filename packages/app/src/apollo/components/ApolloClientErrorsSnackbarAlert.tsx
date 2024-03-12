import { useEffect } from 'react';

import { useSnackbarError } from '../../components/feedback/SnackbarAlertProvider';
import useAddFetchResultErrorHandler from '../hooks/useAddFetchResultErrorHandler';

export default function ApolloClientErrorsSnackbarAlert() {
  const addHandler = useAddFetchResultErrorHandler();

  const showError = useSnackbarError();

  useEffect(() => {
    return addHandler(async (_value, firstError) => {
      showError(firstError.message);
      return Promise.resolve(false);
    });
  }, [addHandler, showError]);

  return null;
}
