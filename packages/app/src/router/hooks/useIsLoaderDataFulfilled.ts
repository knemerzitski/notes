import { useState, useEffect, useRef } from 'react';
import { useLogger } from '../../utils/context/logger';

export function useIsLoaderDataFulfilled<TKey extends string>(
  Route: {
    useLoaderData: (args: {
      select: (match: Record<TKey, unknown>) => unknown;
    }) => Record<TKey, Promise<unknown>>;
  },
  key: TKey
) {
  const logger = useLogger('useIsLoaderDataFulfilled');

  const latestPromiseRef = useRef<Promise<unknown> | null>(null);
  const matchCounterRef = useRef(0);

  const [loaded, setLoaded] = useState<{
    isLoaded: boolean;
    promise: Promise<unknown> | null;
  }>({
    isLoaded: false,
    promise: null,
  });

  Route.useLoaderData({
    select(match) {
      const promise = match[key] as Promise<unknown>;
      if (latestPromiseRef.current !== promise) {
        latestPromiseRef.current = promise;
        matchCounterRef.current++;
      }
      return matchCounterRef.current;
    },
  });

  const newPromise = latestPromiseRef.current;

  useEffect(() => {
    if (loaded.promise !== newPromise) {
      logger?.debug('promiseChanged', {
        isLoaded: false,
        promise: newPromise,
      });
      setLoaded({
        isLoaded: false,
        promise: newPromise,
      });
    }
  }, [logger, loaded.promise, newPromise]);

  useEffect(() => {
    const promise = loaded.promise;
    if (!promise) {
      return;
    }

    let ignoreFinally = false;
    logger?.debug('attachFinally');
    void promise.finally(() => {
      if (ignoreFinally) {
        return;
      }

      logger?.debug('attachFinally.invoked');
      setLoaded({
        promise,
        isLoaded: true,
      });
    });

    return () => {
      logger?.debug('attachFinally.unmount');
      ignoreFinally = true;
    };
  }, [logger, loaded.promise]);

  return loaded.isLoaded;
}
