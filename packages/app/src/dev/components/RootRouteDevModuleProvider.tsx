import { ReactNode, Suspense } from 'react';

import { isDevToolsEnabled } from '../utils/dev-tools';

import { DevTools } from './DevTools';
import { TanStackRouterDevtools } from './TanStackRouterDevTools';

function DevModule({ children }: { children: ReactNode }) {
  return (
    <>
      {children}

      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>

      <DevTools />
    </>
  );
}

export const RootRouteDevModuleProvider = isDevToolsEnabled() ? DevModule : () => null;
