export enum LocalStoragePrefix {
  Auth = 'auth',
  Apollo = 'apollo',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}
