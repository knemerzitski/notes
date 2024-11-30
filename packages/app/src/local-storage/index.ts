/**
 * Use prefix to avoid accidental conflicts in Local Storage
 */
export enum LocalStoragePrefix {
  /**
   * Apollo Client. App state is persisted.
   */
  APOLLO = 'apollo',
  /**
   * Only needed during inital startup of the app
   */
  BOOTSTRAP = 'bootstrap',
}

export function localStorageKey(prefix: LocalStoragePrefix, value: string) {
  return `${prefix}:${value}`;
}
