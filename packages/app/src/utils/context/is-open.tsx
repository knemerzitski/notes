import { createContext, ReactNode, useContext } from 'react';

const IsOpenContext = createContext<boolean>(false);

export function useIsOpen(): boolean {
  return useContext(IsOpenContext);
}

export function IsOpenProvider({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return <IsOpenContext.Provider value={open}>{children}</IsOpenContext.Provider>;
}
