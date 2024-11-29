import { useEffect, useRef, useState } from 'react';

/**
 * Prevents a component from being opened and closed immediately
 * by allowing it to open after a delay and ensuring it stays open for the duration
 */
export function useSmoothOpen(
  /**
   * If component wants to be open or not
   */
  componentOpen: boolean,
  /**
   * Component must exit after calling this.
   */
  onExited: () => void,
  options?: {
    /**
     * Time in milliseconds to delay opening
     * @default 100
     */
    delay?: number;
    /**
     * Time in milliseconds how long must be open
     * @default 500
     */
    duration?: number;
  }
) {
  const delay = options?.delay ?? 100;
  const duration = options?.duration ?? 500;

  const delayTimerIdRef = useRef<NodeJS.Timeout | undefined>();
  const durationTimerIdRef = useRef<NodeJS.Timeout | undefined>();
  const isComponentOpenRef = useRef(componentOpen);
  const wasComponentOpenRef = useRef(componentOpen);
  const delayStatusRef = useRef<'init' | 'in_progress' | 'done'>('init');
  const openStartTimeRef = useRef<number | null>(null);

  const [open, setOpen] = useState(componentOpen);

  function reset() {
    isComponentOpenRef.current = componentOpen;
    wasComponentOpenRef.current = componentOpen;
    delayStatusRef.current = 'init';
    openStartTimeRef.current = null;
    clearTimeout(delayTimerIdRef.current);
    clearTimeout(durationTimerIdRef.current);
  }

  useEffect(() => {
    // Remember if component was open and is open
    if (isComponentOpenRef.current && !componentOpen) {
      wasComponentOpenRef.current = true;
    }
    isComponentOpenRef.current = componentOpen;

    function invokeOpen() {
      openStartTimeRef.current = Date.now();
      setOpen(true);
    }

    function invokeClose() {
      setOpen(false);
    }

    function invokeExited() {
      onExited();
    }

    if (delayStatusRef.current === 'init') {
      delayStatusRef.current = 'in_progress';
      // Start delay
      clearTimeout(delayTimerIdRef.current);
      delayTimerIdRef.current = setTimeout(() => {
        delayStatusRef.current = 'done';

        if (isComponentOpenRef.current) {
          // Delay has passed, component is open => must open
          invokeOpen();
        } else {
          if (wasComponentOpenRef.current) {
            // Delay has passed, component was open and is now closed => must call onExited
            invokeExited();
          } else {
            // Delay has passed, component wasn't open and isn't open => do nothing
          }
        }
      }, delay);

      return;
    }

    // Prevent starting open timer while delay hasn't elapsed
    if (delayStatusRef.current === 'in_progress') {
      return;
    }

    if (componentOpen) {
      if (openStartTimeRef.current == null) {
        // Parent opened, open and start time
        invokeOpen();
      }
    } else {
      if (openStartTimeRef.current != null) {
        const openTime = Date.now() - openStartTimeRef.current;

        if (openTime >= duration) {
          // Can close since target duration has elapsed
          invokeClose();
          return;
        }

        // Must wait a bit longer before can close
        clearTimeout(durationTimerIdRef.current);
        durationTimerIdRef.current = setTimeout(() => {
          // Modal was open for target duration, can close
          invokeClose();
        }, duration - openTime);
      }
    }
  }, [componentOpen, onExited, duration, delay]);

  return {
    open,
    delayStatus: delayStatusRef.current,
    reset,
  };
}
