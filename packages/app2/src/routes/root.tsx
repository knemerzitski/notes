import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { Suspense } from 'react';
import { TanStackRouterDevtools } from './components/TanStackRouterDevTools';
import { RouterContext } from '../router';
import { PageCenterBox } from '../utils/components/PageCenterBox';
import { Divider } from '@mui/material';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <PageCenterBox flexDirection="column">
      Hello App!
      <Divider />
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </PageCenterBox>
  );
}
