import { RouterProvider } from '@tanstack/react-router';
import { createRouterContext, router } from '../../router';
import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';

export function AppRouterProvider() {
  const apolloClient = useApolloClient();

  const context = useMemo(
    () =>
      createRouterContext({
        apolloClient,
      }),
    [apolloClient]
  );

  return <RouterProvider router={router} context={context} />;
}
