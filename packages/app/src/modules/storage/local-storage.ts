export enum LocalStoragePrefix {
  AUTH = 'auth',
  APOLLO = 'apollo',
  THEME = 'theme',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}
