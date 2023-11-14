import { ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import { Location, useLocation } from 'react-router-dom';

const PreviousLocationContext = createContext<Location | undefined | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export default function usePreviousLocation() {
  const ctx = useContext(PreviousLocationContext);
  if (ctx === null) {
    throw new Error(
      'Error: usePreviousLocation() may be used only in the context of a <PreviousLocationProvider> component.'
    );
  }
  return ctx;
}

export function PreviousLocationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prevLocationRef = useRef<Location>();

  useEffect(() => {
    prevLocationRef.current = location;
  }, [location]);

  return (
    <PreviousLocationContext.Provider value={prevLocationRef.current}>
      {children}
    </PreviousLocationContext.Provider>
  );
}
