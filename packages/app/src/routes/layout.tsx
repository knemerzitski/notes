import { createFileRoute, Outlet } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { AppBarDrawerLayout } from '../layout/components/AppBarDrawerLayout';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';

const RouteRootLayout_Query = gql(`
  query RouteRootLayout_QUery($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
      ...AppBarDrawerLayout_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout')({
  component: Layout,
  loader: (ctx) => {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return;
    }

    // Don't query when parent is root as root already queries everything neede in here
    if (ctx.route.parentRoute.isRoot) {
      return;
    }

    return {
      query: apolloClient
        .query({
          query: RouteRootLayout_Query,
          variables: {
            userBy: {
              id: userId,
            },
          },
          fetchPolicy,
        })
        .then(setIsSucessfullyFetched),
    };
  },
});

function Layout() {
  return (
    <AppBarDrawerLayout>
      <Outlet />
    </AppBarDrawerLayout>
  );
}
