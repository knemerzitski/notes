/* eslint-disable unicorn/filename-case */
import { useEffect } from 'react';
import { useErrorLink } from '../../graphql/context/error-link';
import { useShowError } from '../context/show-error';

export function GraphQLErrorsShowSnackBar() {
  const showError = useShowError();
  const errorLink = useErrorLink();

  useEffect(() => {
    return errorLink.eventBus.on('error', (event) => {
      if (event.handled) return;
      event.handled = true;

      const { firstError } = event;
      showError(firstError.message);
    });
  }, [errorLink, showError]);

  return null;
}
