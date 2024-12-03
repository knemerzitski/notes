import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

import { PersistLink } from '../link/persist';

type ProvidedPersistLink = Pick<PersistLink, 'generateId'>;

const PersistLinkContext = createContext<ProvidedPersistLink | null>(null);

export function usePersistLink(nullable: true): Maybe<ProvidedPersistLink>;
export function usePersistLink(nullable?: false): ProvidedPersistLink;
export function usePersistLink(nullable?: boolean): Maybe<ProvidedPersistLink> {
  const ctx = useContext(PersistLinkContext);
  if (ctx === null && !nullable) {
    throw new Error('usePersistLink() requires context <PersistLinkProvider>');
  }
  return ctx;
}

export function PersistLinkProvider({
  persistLink,
  children,
}: {
  persistLink: ProvidedPersistLink;
  children: ReactNode;
}) {
  return (
    <PersistLinkContext.Provider value={persistLink}>
      {children}
    </PersistLinkContext.Provider>
  );
}
