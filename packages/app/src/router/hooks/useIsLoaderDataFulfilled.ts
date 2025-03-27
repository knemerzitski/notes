import { useState, useRef } from 'react';

export function useIsLoaderDataFulfilled<TKey extends string>(
  Route: {
    useLoaderData: (args: {
      select: (match: Record<TKey, unknown>) => unknown;
    }) => unknown;
  },
  key: TKey
) {
  const valueRef = useRef<unknown>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  Route.useLoaderData({
    select(match) {
      const value = match[key];
      if (valueRef.current === value) {
        return;
      }
      valueRef.current = value;
      setIsLoaded(false);

      void Promise.resolve(value).finally(() => {
        if (valueRef.current === value) {
          setIsLoaded(true);
        }
      });

      return;
    },
  });

  return isLoaded;
}
