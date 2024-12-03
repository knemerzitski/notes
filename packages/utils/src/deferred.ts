export interface Deferred<T> {
  promise: Promise<T>;
  resolve: DeferredResolve<T>;
  reject: (reason?: unknown) => void;
}

type DeferredResolve<T> = undefined extends T
  ? () => void
  : (value: T | PromiseLike<T>) => void;

/**
 * Creates a new Promise and passes resolve, reject in return object.
 * @returns
 */
export function createDeferred<T = undefined>(): Deferred<T> {
  const obj: Omit<Deferred<T>, 'promise'> = {
    resolve: () => {
      throw new Error('Promise has not started yet');
    },
    reject: () => {
      throw new Error('Promise has not started yet');
    },
  };

  const promise = new Promise<T>((resolve, reject) => {
    //@ts-expect-error Ignore error
    obj.resolve = resolve;
    obj.reject = reject;
  });

  return {
    ...obj,
    promise,
  };
}
