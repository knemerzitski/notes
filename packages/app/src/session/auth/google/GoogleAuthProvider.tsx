import { ReactNode, createContext, useContext, useMemo } from 'react';

import useLoadClientScript, {
  UseLoadClientScriptOptions,
} from './hooks/useLoadGsiScript';

interface GoogleAuthContextProps {
  clientId: string;
  isScriptLoaded: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextProps | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
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

export default function GoogleAuthProvider({
  clientId,
  children,
  onLoad,
  onError,
}: GoogleAuthProviderProps) {
  const isLoaded = useLoadClientScript({
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
