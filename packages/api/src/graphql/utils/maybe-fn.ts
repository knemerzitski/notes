import { Maybe, MaybePromise } from '~utils/types';
import { ResolverTypeWrapper } from '../types.generated';

export function maybeFn<T>(wrapper: ResolverTypeWrapper<T>): MaybePromise<Maybe<T>> {
  if (wrapper instanceof Promise) {
    return wrapper;
  }

  if (typeof wrapper === 'function') {
    return (wrapper as () => MaybePromise<Maybe<T>>)();
  }

  return wrapper;
}
