import { ReactNode, Suspense } from 'react';

import { IsDesktop } from '../../utils/components/IsDesktop';
import { isDevToolsEnabled } from '../utils/dev-tools';

import { DevTools } from './DevTools';
import { TanStackRouterDevtools } from './TanStackRouterDevTools';

function DevModule({ children }: { children: ReactNode }) {
  return (
    <>
      {children}

      <IsDesktop>
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>

        <DevTools />
      </IsDesktop>
    </>
  );
}

function PassChildren({ children }: { children: ReactNode }) {
  return children;
}

export const RootRouteDevModuleProvider = isDevToolsEnabled() ? DevModule : PassChildren;
