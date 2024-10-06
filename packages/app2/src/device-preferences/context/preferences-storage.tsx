import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';
import { PreferencesStorage } from '../utils/preferences-storage';

type ProvidedPreferencesStorage = Pick<
  PreferencesStorage,
  'getColorMode' | 'setColorMode'
>;

const PreferencesStorageContext = createContext<ProvidedPreferencesStorage | null>(null);

export function usePreferencesStorage(nullable: true): Maybe<ProvidedPreferencesStorage>;
export function usePreferencesStorage(nullable?: false): ProvidedPreferencesStorage;
export function usePreferencesStorage(
  nullable?: boolean
): Maybe<ProvidedPreferencesStorage> {
  const ctx = useContext(PreferencesStorageContext);
  if (ctx === null && !nullable) {
    throw new Error(
      'usePreferencesStorage() requires context <PreferencesStorageProvider>'
    );
  }
  return ctx;
}

export function PreferencesStorageProvider({
  value,
  children,
}: {
  value: ProvidedPreferencesStorage;
  children: ReactNode;
}) {
  return (
    <PreferencesStorageContext.Provider value={value}>
      {children}
    </PreferencesStorageContext.Provider>
  );
}
