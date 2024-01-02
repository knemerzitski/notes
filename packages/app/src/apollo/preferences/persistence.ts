import { ColorMode, Preferences } from '../__generated__/graphql';

const PREFERENCES_KEY = 'preferences';

const DEFAULT_PREFERENCES: Preferences = {
  colorMode: ColorMode.System,
};

export function readPreferences() {
  const prefStr = localStorage.getItem(PREFERENCES_KEY);
  return prefStr ? (JSON.parse(prefStr) as Preferences) : DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: Preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}
