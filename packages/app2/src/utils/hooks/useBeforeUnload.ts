import { useEffect, useRef } from 'react';

export function useBeforeUnload(
  listener: (this: Window, event: BeforeUnloadEvent) => void
) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const _listener = listenerRef.current;

    window.addEventListener('beforeunload', _listener);
    return () => {
      window.removeEventListener('beforeunload', _listener);
    };
  }, []);
}
