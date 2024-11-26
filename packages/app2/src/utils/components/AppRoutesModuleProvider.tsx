import { RouterProvider } from '@tanstack/react-router';
import { createRouterContext, router } from '../../router';
import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { FetchedRoutesProvider, useFetchedRoutes } from '../context/fetched-routes';

export function AppRoutesModuleProvider() {
  return (
    <FetchedRoutesProvider>
      <InnerProvider />
    </FetchedRoutesProvider>
  );
}

function InnerProvider() {
  const apolloClient = useApolloClient();
  const fetchedRoutes = useFetchedRoutes();

  const context = useMemo(
    () =>
      createRouterContext({
        apolloClient,
        fetchedRoutes,
      }),
    [apolloClient, fetchedRoutes]
  );

  return <RouterProvider router={router} context={context} />;
}
