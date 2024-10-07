import { ReactNode } from 'react';
import { PreferencesStorageProvider } from '../context/preferences-storage';
import { createDefaultPreferencesStorage } from '..';
import { useConstant } from '../../utils/hooks/useConstant';

export function AppPreferencesStorageProvider({ children }: { children: ReactNode }) {
  const preferencesStorage = useConstant(() => createDefaultPreferencesStorage());

  return (
    <PreferencesStorageProvider value={preferencesStorage}>
      {children}
    </PreferencesStorageProvider>
  );
}
