export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

/**
 * Creates a new Promise and passes resolve, reject in return object.
 * @returns
 */
export default function createDeferred<T>(): Deferred<T> {
  const obj: Omit<Deferred<T>, 'promise'> = {
    resolve: () => {
      throw new Error('Promise has not started yet');
    },
    reject: () => {
      throw new Error('Promise has not started yet');
    },
  };

  const promise = new Promise<T>((resolve, reject) => {
    obj.resolve = resolve;
    obj.reject = reject;
  });

  return {
    ...obj,
    promise,
  };
}
