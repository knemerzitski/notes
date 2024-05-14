import { useEffect } from 'react';

import useAddFetchResultErrorHandler from '../hooks/useAddFetchResultErrorHandler';
import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';

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
