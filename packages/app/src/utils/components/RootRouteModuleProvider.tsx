import { ReactNode } from 'react';

import { RootRouteDevModuleProvider } from '../../dev/components/RootRouteDevModuleProvider';
import { RootRouteNoteModuleProvider } from '../../note/components/RootRouteNoteModuleProvider';
import { RootRouteUserModuleProvider } from '../../user/components/RootRouteUserModuleProvider';

import { RootRouteRoutesModuleProvider } from './RootRouteRoutesModuleProvider';

export function RootRouteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <RootRouteUserModuleProvider>
      <RootRouteNoteModuleProvider>
        <RootRouteDevModuleProvider>
          <RootRouteRoutesModuleProvider>{children}</RootRouteRoutesModuleProvider>
        </RootRouteDevModuleProvider>
      </RootRouteNoteModuleProvider>
    </RootRouteUserModuleProvider>
  );
}
