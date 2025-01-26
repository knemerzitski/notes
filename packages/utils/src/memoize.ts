export function memoize<R>(fn: () => R): () => R {
  let result: R | undefined;
  return () => {
    if (result === undefined) {
      result = fn();
    }

    return result;
  };
}
