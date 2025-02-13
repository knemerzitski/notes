import { ReactNode } from 'react';

import { CurrentUserChangedRefresh } from './CurrentUserChangedRefresh';

export function RootRouteUserModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <CurrentUserChangedRefresh />

      {children}
    </>
  );
}
