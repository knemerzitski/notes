/**
 * Use prefix to avoid accidental conflicts in Local Storage
 */
export enum LocalStoragePrefix {
  APOLLO = 'apollo',
  THEME = 'theme',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}