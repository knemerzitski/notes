import { ReactNode, createContext, useContext } from 'react';

const LocationPrefixContext = createContext<string | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationPrefix() {
  const ctx = useContext(LocationPrefixContext);
  if (ctx === null) {
    throw new Error('useLocationPrefix() requires context <LocationPrefixProvider>');
  }
  return ctx;
}

export default function LocationPrefixProvider({
  prefix,
  children,
}: {
  prefix: string;
  children: ReactNode;
}) {
  return (
    <LocationPrefixContext.Provider value={prefix}>
      {children}
    </LocationPrefixContext.Provider>
  );
}
