import { ReactNode } from 'react';
import { PreferencesStorageProvider } from '../context/preferences-storage';
import { createDefaultPreferencesStorage } from '..';

const preferencesStorage = createDefaultPreferencesStorage();

export function AppDevicePreferencesModuleProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PreferencesStorageProvider storage={preferencesStorage}>
      {children}
    </PreferencesStorageProvider>
  );
}
