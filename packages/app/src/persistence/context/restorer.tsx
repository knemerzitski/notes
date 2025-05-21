import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { Restorer } from '../types';

type ProvidedRestorer = Pick<Restorer, 'restore' | 'status'>;

const RestorerContext = createContext<ProvidedRestorer | null>(null);

export function useRestorer(nullable: true): Maybe<ProvidedRestorer>;
export function useRestorer(nullable?: false): ProvidedRestorer;
export function useRestorer(nullable?: boolean): Maybe<ProvidedRestorer> {
  const ctx = useContext(RestorerContext);
  if (ctx === null && !nullable) {
    throw new Error('useRestorer() requires context <RestorerProvider>');
  }
  return ctx;
}

export function RestorerProvider({
  restorer,
  children,
}: {
  restorer: ProvidedRestorer;
  children: ReactNode;
}) {
  return <RestorerContext.Provider value={restorer}>{children}</RestorerContext.Provider>;
}
