import { useEffect } from 'react';

/**
 * Triggers listener on `beforeunload` event.
 * @param listener Must be from `useCallback` or an external function to not
 * add/remove listener on every rerender
 */

export function useBeforeUnload(
  listener: (this: Window, event: BeforeUnloadEvent) => void
) {
  useEffect(() => {
    window.addEventListener('beforeunload', listener);
    return () => {
      window.removeEventListener('beforeunload', listener);
    };
  }, [listener]);
}
