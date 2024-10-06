import { localStorageKey, LocalStoragePrefix } from '../local-storage';
import { PreferencesStorage } from './utils/preferences-storage';

export function createDefaultPreferencesStorageParams(): ConstructorParameters<
  typeof PreferencesStorage
>[0] {
  return {
    key: localStorageKey(LocalStoragePrefix.PREFERENCES, 'device'),
    storage: window.localStorage,
  };
}

export function createDefaultPreferencesStorage() {
  return new PreferencesStorage(createDefaultPreferencesStorageParams());
}
