import { useCallback } from 'react';
import { clientSynchronizationVar } from '../reactive-vars';

type UpdateFn = (key: unknown, synchronized: boolean) => void;

interface UseUpdateClientSynchronizationOptions {
  stateVar: typeof clientSynchronizationVar;
}

export default function useUpdateClientSynchronization(
  options?: UseUpdateClientSynchronizationOptions
) {
  const stateVar = options?.stateVar ?? clientSynchronizationVar;

  return useCallback<UpdateFn>(
    (key, synchronized) => {
      const set = stateVar();
      if (synchronized) {
        if (set.has(key)) {
          const newSet = new Set(set);
          newSet.delete(key);
          stateVar(newSet);
        }
      } else {
        if (!set.has(key)) {
          const newSet = new Set(set);
          newSet.add(key);
          stateVar(newSet);
        }
      }
    },
    [stateVar]
  );
}
