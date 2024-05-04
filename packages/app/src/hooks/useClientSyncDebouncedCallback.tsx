import { useMemo } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';
import useUpdateClientSynchronization from '../local-state/base/hooks/useUpdateClientSynchronization';

const useClientSyncDebouncedCallback: typeof useDebouncedCallback = <
  T extends (...args: unknown[]) => ReturnType<T>,
>(
  func: T,
  wait?: number | undefined,
  options?: Options | undefined
) => {
  const updateClientSynchronization = useUpdateClientSynchronization();

  const originalDebounce = useDebouncedCallback(
    () => {
      updateClientSynchronization(originalDebounce, true);
      return func();
    },
    wait,
    options
  );

  return useMemo(() => {
    const func: typeof originalDebounce = (...args) => {
      updateClientSynchronization(originalDebounce, false);
      return originalDebounce(...args);
    };

    func.cancel = () => {
      updateClientSynchronization(originalDebounce, true);
      originalDebounce.cancel();
    };
    func.isPending = originalDebounce.isPending;
    func.flush = originalDebounce.flush;

    return func;
  }, [originalDebounce, updateClientSynchronization]);
};

export default useClientSyncDebouncedCallback;
