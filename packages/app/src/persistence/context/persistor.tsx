import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { Persistor } from '../types';

type ProvidedPersistor = Pick<Persistor, 'flush' | 'isPending' | 'on' | 'off'>;

const PersistorContext = createContext<ProvidedPersistor | null>(null);

export function usePersistor(nullable: true): Maybe<ProvidedPersistor>;
export function usePersistor(nullable?: false): ProvidedPersistor;
export function usePersistor(nullable?: boolean): Maybe<ProvidedPersistor> {
  const ctx = useContext(PersistorContext);
  if (ctx === null && !nullable) {
    throw new Error('usePersistor() requires context <PersistorProvider>');
  }
  return ctx;
}

export function PersistorProvider({
  persistor,
  children,
}: {
  persistor: ProvidedPersistor;
  children: ReactNode;
}) {
  return (
    <PersistorContext.Provider value={persistor}>{children}</PersistorContext.Provider>
  );
}
