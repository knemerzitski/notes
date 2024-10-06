/**
 * Use prefix to avoid accidental conflicts in Local Storage
 */
export enum LocalStoragePrefix {
  APOLLO = 'apollo',
  PREFERENCES = 'preferences',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}
