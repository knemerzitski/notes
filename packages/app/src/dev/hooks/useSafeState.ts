/**
 * Copied from @tanstack/router packages/router-devtools/src/utils.ts
 */

import { useCallback, useState } from 'react';
import { useIsMounted } from './useIsMounted';

/**
 * This hook is a safe useState version which schedules state updates in microtasks
 * to prevent updating a component state while React is rendering different components
 * or when the component is not mounted anymore.
 */
export function useSafeState<T>(initialState: T): [T, (value: T) => void] {
  const isMounted = useIsMounted();
  const [state, setState] = useState(initialState);

  const safeSetState = useCallback(
    (value: T) => {
      scheduleMicrotask(() => {
        if (isMounted) {
          setState(value);
        }
      });
    },
    [isMounted]
  );

  return [state, safeSetState];
}

/**
 * Schedules a microtask.
 * This can be useful to schedule state updates after rendering.
 */
function scheduleMicrotask(callback: () => void) {
  Promise.resolve()
    .then(callback)
    // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
    .catch((error) =>
      setTimeout(() => {
        throw error;
      })
    );
}
