import { useApolloClient } from '@apollo/client';
import { RouterProvider } from '@tanstack/react-router';

import { useEffect, useMemo } from 'react';

import { createRouterContext, router } from '../../router';
import { useUserId } from '../../user/context/user-id';
import { useLogger } from '../../utils/context/logger';
import { FetchedRoutesProvider, useFetchedRoutes } from '../context/fetched-routes';

export function AppRouterModuleProvider() {
  return (
    <FetchedRoutesProvider>
      <InnerProvider />
    </FetchedRoutesProvider>
  );
}

function InnerProvider() {
  const logger = useLogger('RouterContext');
  const apolloClient = useApolloClient();
  const fetchedRoutes = useFetchedRoutes();

  const context = useMemo(
    () =>
      createRouterContext({
        apolloClient,
        fetchedRoutes,
        logger,
      }),
    [apolloClient, fetchedRoutes, logger]
  );

  return (
    <>
      <UserChangedRouterInvalidate />
      <RouterProvider router={router} context={context} />
    </>
  );
}

function UserChangedRouterInvalidate() {
  const userId = useUserId(true);

  useEffect(() => {
    // Invalidate router to rerun all relevant loaders after user has changed
    void router
      .invalidate({
        sync: true,
      })
      .then(() => {
        void router.navigate({ to: '.', search: (prev) => prev });
      });
  }, [userId]);

  return null;
}
