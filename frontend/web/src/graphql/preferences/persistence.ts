import { Preferences } from '../__generated__/graphql';

export function readPreferences() {
  const prefStr = localStorage.getItem('preferences');
  return prefStr ? (JSON.parse(prefStr) as Preferences) : null;
}

export function savePreferences(preferences: Preferences) {
  localStorage.setItem('preferences', JSON.stringify(preferences));
}
