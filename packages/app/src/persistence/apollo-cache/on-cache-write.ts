/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ApolloCache } from '@apollo/client/core';

export interface TriggerFunctionConfig<T> {
  cache: ApolloCache<T>;
}

export function onCacheWrite(cache: ApolloCache<unknown>, callback: () => void) {
  const write = cache.write;
  const evict = cache.evict;
  const modify = cache.modify;
  const gc = cache.gc;

  cache.write = (...args: any[]) => {
    // @ts-expect-error Ignore arguments check
    const result = write.apply(cache, args);
    callback();
    return result;
  };

  cache.evict = (...args: any[]) => {
    // @ts-expect-error Ignore arguments check
    const result = evict.apply(cache, args);
    callback();
    return result;
  };

  cache.modify = (...args: any[]) => {
    // @ts-expect-error Ignore arguments check
    const result = modify.apply(cache, args);
    callback();
    return result;
  };

  cache.gc = (...args: any[]) => {
    // @ts-expect-error Ignore arguments check
    const result = gc.apply(cache, args);
    callback();
    return result;
  };

  return () => {
    cache.write = write;
    cache.evict = evict;
    cache.modify = modify;
    cache.gc = gc;
  };
}
