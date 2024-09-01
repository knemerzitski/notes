/**
 * Memoizes one argument function.
 * Uses Map.
 */
export function memoize1Plain<A, R>(fn: (arg: A) => R): (arg: A) => R {
  let cache: Map<A, R> | undefined;
  return (arg) => {
    if (cache === undefined) {
      cache = new Map();
    }

    let result = cache.get(arg);
    if (result === undefined) {
      result = fn(arg);
      cache.set(arg, result);
    }

    return result;
  };
}

/**
 * Memoizes one argument function.
 * Uses WeakMap.
 */
export function memoize1<A extends WeakKey, R>(fn: (arg: A) => R): (arg: A) => R {
  let cache: WeakMap<A, R> | undefined;

  function memoized(arg: A) {
    if (cache === undefined) {
      cache = new WeakMap();
    }

    let result = cache.get(arg);
    if (result === undefined) {
      result = fn(arg);
      cache.set(arg, result);
    }

    return result;
  }

  return memoized;
}
