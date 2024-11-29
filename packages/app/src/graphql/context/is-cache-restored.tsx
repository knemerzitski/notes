import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

const IsCacheRestoredContext = createContext<boolean | null>(null);

export function useIsCacheRestored(nullable: true): Maybe<boolean>;
export function useIsCacheRestored(nullable?: false): boolean;
export function useIsCacheRestored(nullable?: boolean): Maybe<boolean> {
  const ctx = useContext(IsCacheRestoredContext);
  if (ctx === null && !nullable) {
    throw new Error('useIsCacheRestored() requires context <IsCacheRestoredProvider>');
  }
  return ctx;
}

export function IsCacheRestoredProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <IsCacheRestoredContext.Provider value={value}>
      {children}
    </IsCacheRestoredContext.Provider>
  );
}
