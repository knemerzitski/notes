import { createContext, ReactNode, useContext } from 'react';

const IsMobileContext = createContext<boolean>(false);

export function useIsMobile(): boolean {
  return useContext(IsMobileContext);
}

export function IsMobileProvider({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: ReactNode;
}) {
  return <IsMobileContext.Provider value={isMobile}>{children}</IsMobileContext.Provider>;
}
