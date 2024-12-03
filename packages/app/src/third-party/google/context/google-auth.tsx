import { ReactNode, createContext, useContext, useMemo } from 'react';

import { UseLoadClientScriptOptions, useLoadGsiScript } from '../hooks/useLoadGsiScript';

interface GoogleAuthContextProps {
  clientId: string;
  isScriptLoaded: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextProps | null>(null);

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (ctx === null) {
    throw new Error('useGoogleAuth() requires context <GoogleAuthProvider>');
  }
  return ctx;
}

interface GoogleAuthProviderProps extends UseLoadClientScriptOptions {
  clientId: string;
  children: ReactNode;
}

export function GoogleAuthProvider({
  clientId,
  children,
  onLoad,
  onError,
}: GoogleAuthProviderProps) {
  const isLoaded = useLoadGsiScript({
    onLoad,
    onError,
  });

  const contextValue = useMemo(
    () => ({ clientId, isScriptLoaded: isLoaded }),
    [clientId, isLoaded]
  );

  return (
    <GoogleAuthContext.Provider value={contextValue}>
      {children}
    </GoogleAuthContext.Provider>
  );
}
