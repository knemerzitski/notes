import { Maybe, MaybePromise } from '~utils/types';
import { ResolverTypeWrapper } from '../types.generated';

// TODO utils generic func??
export function maybeCallFn<T>(wrapper: ResolverTypeWrapper<T>): MaybePromise<Maybe<T>> {
  if (wrapper instanceof Promise) {
    return wrapper;
  }

  if (typeof wrapper === 'function') {
    return (wrapper as () => MaybePromise<Maybe<T>>)();
  }

  return wrapper;
}
