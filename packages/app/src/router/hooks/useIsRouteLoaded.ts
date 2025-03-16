import { useState, useEffect } from 'react';

export function useIsRouteLoaded<TKey extends string>(
  Route: {
    useLoaderData: (args: {
      select: (match: Record<TKey, unknown>) => unknown;
    }) => Record<TKey, Promise<unknown>>;
  },
  key: TKey
) {
  const promise = Route.useLoaderData({
    select(match) {
      return match[key];
    },
  }) as unknown as Promise<unknown>;

  const [loaded, setLoaded] = useState({
    isLoaded: false,
    promise,
  });

  useEffect(() => {
    if (loaded.promise !== promise) {
      setLoaded({
        isLoaded: false,
        promise,
      });
    }
  }, [loaded, promise]);

  useEffect(() => {
    void promise.finally(() => {
      setLoaded((prev) => {
        if (prev.promise === promise) {
          return {
            isLoaded: true,
            promise,
          };
        }
        return prev;
      });
    });
  }, [promise]);

  return loaded.isLoaded;
}
