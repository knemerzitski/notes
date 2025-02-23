import { ReactNode } from 'react';

import { RootRouteDevModuleProvider } from './dev/components/RootRouteDevModuleProvider';
import { RootRouteNoteModuleProvider } from './note/components/RootRouteNoteModuleProvider';
import { RootRouteRouterModuleProvider } from './router/components/RootRouteRouterModuleProvider';
import { RootRouteUserModuleProvider } from './user/components/RootRouteUserModuleProvider';


export function RootRoute({ children }: { children: ReactNode }) {
  return (
    <RootRouteUserModuleProvider>
      <RootRouteNoteModuleProvider>
        <RootRouteDevModuleProvider>
          <RootRouteRouterModuleProvider>{children}</RootRouteRouterModuleProvider>
        </RootRouteDevModuleProvider>
      </RootRouteNoteModuleProvider>
    </RootRouteUserModuleProvider>
  );
}
