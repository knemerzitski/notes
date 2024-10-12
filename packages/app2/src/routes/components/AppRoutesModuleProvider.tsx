import { RouterProvider } from '@tanstack/react-router';
import { createRouterContext, router } from '../../router';
import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';

export function AppRoutesModuleProvider() {
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
