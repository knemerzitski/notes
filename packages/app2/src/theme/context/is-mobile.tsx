import { createContext, ReactNode, useContext } from 'react';

const IsMobileContext = createContext<boolean>(false);

export function useIsMobile(): boolean {
  return useContext(IsMobileContext);
}

export function IsMobileProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <IsMobileContext.Provider value={value}>{children}</IsMobileContext.Provider>;
}
