import { ReactNode, createContext, useContext } from 'react';

const BackgroundPathContext = createContext<string | undefined | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
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
