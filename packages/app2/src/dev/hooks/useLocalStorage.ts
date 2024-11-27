/**
 * Copied from @tanstack/router packages/router-devtools/src/useLocalStorage.ts
 */

import { useCallback, useEffect, useState } from 'react';

const getItem = (key: string): unknown => {
  try {
    const itemValue = localStorage.getItem(key);
    if (typeof itemValue === 'string') {
      return JSON.parse(itemValue);
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export function useLocalStorage<T>(
  key: string,
  defaultValue: T | undefined
): [T | undefined, (newVal: T | ((prevVal: T) => T)) => void] {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    const initialValue = getItem(key) as T | undefined;

    if (initialValue == null) {
      setValue(typeof defaultValue === 'function' ? defaultValue() : defaultValue);
    } else {
      setValue(initialValue);
    }
  }, [defaultValue, key]);

  const setter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updater: any) => {
      setValue((old) => {
        let newVal = updater;

        if (typeof updater == 'function') {
          newVal = updater(old);
        }
        try {
          localStorage.setItem(key, JSON.stringify(newVal));
        } catch {
          //
        }

        return newVal;
      });
    },
    [key]
  );

  return [value, setter];
}
