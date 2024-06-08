export enum LocalStoragePrefix {
  Auth = 'auth',
  Apollo = 'apollo',
  Theme = 'theme',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}
