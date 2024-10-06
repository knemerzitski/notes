import { ReactNode, useRef } from 'react';
import { PreferencesStorageProvider } from '../context/preferences-storage';
import { createDefaultPreferencesStorage } from '..';

export function AppPreferencesStorageProvider({ children }: { children: ReactNode }) {
  const preferencesStorage = useRef(createDefaultPreferencesStorage());

  return (
    <PreferencesStorageProvider value={preferencesStorage.current}>
      {children}
    </PreferencesStorageProvider>
  );
}
