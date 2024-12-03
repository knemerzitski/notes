import { Suspense } from 'react';

import { DevTools } from './DevTools';
import { TanStackRouterDevtools } from './TanStackRouterDevTools';

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
