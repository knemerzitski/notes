import { ReactNode } from 'react';

import { GetCanGoBackProvider } from '../context/get-can-go-back';

export function RootRouteRouterModuleProvider({ children }: { children: ReactNode }) {
  return <GetCanGoBackProvider>{children}</GetCanGoBackProvider>;
}
