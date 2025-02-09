import { Suspense } from 'react';

import { isDevToolsEnabled } from '../utils/dev-tools';

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

export const RouteDevModuleProvider = isDevToolsEnabled() ? Content : () => null;
