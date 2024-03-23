import { useMemo } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';

import { useUpdateClientSyncStatus } from '../context/ClientSyncStatusProvider';

const useClientSyncDebouncedCallback: typeof useDebouncedCallback = <
  T extends (...args: unknown[]) => ReturnType<T>,
>(
  func: T,
  wait?: number | undefined,
  options?: Options | undefined
) => {
  const updateClientSynchronized = useUpdateClientSyncStatus();

  const originalDebounce = useDebouncedCallback(
    () => {
      updateClientSynchronized(originalDebounce, true);
      return func();
    },
    wait,
    options
  );

  return useMemo(() => {
    const func: typeof originalDebounce = (...args) => {
      updateClientSynchronized(originalDebounce, false);
      return originalDebounce(...args);
    };

    func.cancel = () => {
      updateClientSynchronized(originalDebounce, true);
      originalDebounce.cancel();
    };
    func.isPending = originalDebounce.isPending;
    func.flush = originalDebounce.flush;

    return func;
  }, [originalDebounce, updateClientSynchronized]);
};

export default useClientSyncDebouncedCallback;
