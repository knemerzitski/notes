import { createContext, ReactNode, useContext } from 'react';

const IsLoadingContext = createContext<boolean>(false);

export function useIsLoading(): boolean {
  return useContext(IsLoadingContext);
}

export function IsLoadingProvider({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: ReactNode;
}) {
  return (
    <IsLoadingContext.Provider value={isLoading}>{children}</IsLoadingContext.Provider>
  );
}
