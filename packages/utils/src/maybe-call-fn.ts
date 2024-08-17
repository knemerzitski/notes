export function maybeCallFn<T>(wrapper: T | (() => T)): T {
  if (typeof wrapper === 'function') {
    return (wrapper as () => T)();
  }

  return wrapper;
}
