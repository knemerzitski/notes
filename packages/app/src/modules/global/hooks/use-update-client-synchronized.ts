import { useCallback } from 'react';

import { clientSynchronizationVar } from '../reactive-vars';

type UpdateFn = (key: unknown, synchronized: boolean) => void;

interface UseUpdateClientSynchronizationOptions {
  stateVar: typeof clientSynchronizationVar;
}

export function useUpdateClientSynchronization(
  options?: UseUpdateClientSynchronizationOptions
) {
  const stateVar = options?.stateVar ?? clientSynchronizationVar;

  return useCallback<UpdateFn>(
    (key, synchronized) => {
      const existingState = stateVar();
      if (synchronized) {
        if (existingState.has(key)) {
          const copiedState = new Set(existingState);
          copiedState.delete(key);
          stateVar(copiedState);
        }
      } else {
        if (!existingState.has(key)) {
          const copiedState = new Set(existingState);
          copiedState.add(key);
          stateVar(copiedState);
        }
      }
    },
    [stateVar]
  );
}
