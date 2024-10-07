import { localStorageKey, LocalStoragePrefix } from '../local-storage';
import { PreferencesStorage } from './utils/preferences-storage';

export function createDefaultPreferencesStorageParams(): ConstructorParameters<
  typeof PreferencesStorage
>[0] {
  return {
    key: localStorageKey(LocalStoragePrefix.BOOTSTRAP, 'preferences'),
    storage: window.localStorage,
  };
}

export function createDefaultPreferencesStorage() {
  return new PreferencesStorage(createDefaultPreferencesStorageParams());
}
