import { ReactNode } from 'react';

import { RootRouteDevModuleProvider } from '../../dev/components/RootRouteDevModuleProvider';
import { RootRouteNoteModuleProvider } from '../../note/components/RootRouteNoteModuleProvider';
import { RootRouteUserModuleProvider } from '../../user/components/RootRouteUserModuleProvider';

export function RootRouteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <RootRouteUserModuleProvider>
      <RootRouteNoteModuleProvider>
        <RootRouteDevModuleProvider>{children}</RootRouteDevModuleProvider>
      </RootRouteNoteModuleProvider>
    </RootRouteUserModuleProvider>
  );
}
