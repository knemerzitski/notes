import { ReactNode } from 'react';

import { GetCanGoBackProvider } from '../context/get-can-go-back';

export function RootRouteRoutesModuleProvider({ children }: { children: ReactNode }) {
  return <GetCanGoBackProvider>{children}</GetCanGoBackProvider>;
}
