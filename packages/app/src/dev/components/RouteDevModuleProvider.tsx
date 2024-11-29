import { Suspense } from 'react';
import { TanStackRouterDevtools } from './TanStackRouterDevTools';
import { DevTools } from './DevTools';

function Content() {
  return (
    <>
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>

      <DevTools />
    </>
  );
}

export const RouteDevModuleProvider = import.meta.env.PROD ? () => null : Content;
