import { useEffect, useRef } from 'react';

export default function useBeforeUnload(onConfirmLeave: (e: BeforeUnloadEvent) => void) {
  const onConfirmLeaveRef = useRef(onConfirmLeave);
  onConfirmLeaveRef.current = onConfirmLeave;

  useEffect(() => {
    const onUnload = onConfirmLeaveRef.current;
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [onConfirmLeaveRef]);
}
