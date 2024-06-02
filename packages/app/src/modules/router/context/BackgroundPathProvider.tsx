import { ReactNode, createContext, useContext } from 'react';

const BackgroundPathContext = createContext<string | undefined | null>(null);

export function useBackgroundPath() {
  return useContext(BackgroundPathContext);
}

interface BackgroundPathProviderProps {
  path?: string;
  children: ReactNode;
}

export function BackgroundPathProvider({ path, children }: BackgroundPathProviderProps) {
  return (
    <BackgroundPathContext.Provider value={path}>
      {children}
    </BackgroundPathContext.Provider>
  );
}
