import { useEffect, useRef, useState } from 'react';

/**
 * Prevents a value from changing immediately. No flickers.
 */
export function useSmoothValue<T>(
  value: T,
  options?: {
    /**
     * Time in milliseconds to how long to delay before updating the value
     * @default 100
     */
    delay?: number;
    /**
     * Time in milliseconds how long must value stay the same
     * @default 500
     */
    duration?: number;
  }
): T {
  const delay = options?.delay ?? 100;
  const duration = options?.duration ?? 500;
  const delayTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const valueInDurationRef = useRef<T | null>(null);

  const [displayValue, setDisplayValue] = useState<T>(value);

  useEffect(() => {
    if (durationTimerIdRef.current != null) {
      valueInDurationRef.current = value;
      // Already displaying new value
      return;
    }

    function delaySetValue() {
      if (delayTimerIdRef.current != null) {
        clearTimeout(delayTimerIdRef.current);
      }

      delayTimerIdRef.current = setTimeout(() => {
        setDisplayValue(value);

        const durationTimerId = setTimeout(() => {
          durationTimerIdRef.current = null;
          if (valueInDurationRef.current !== null) {
            setDisplayValue(valueInDurationRef.current);
            valueInDurationRef.current = null;
          }
        }, duration);
        durationTimerIdRef.current = durationTimerId;
        // now must stay this value for duration
      }, delay);
    }

    delaySetValue();
  }, [value, delay, duration]);

  return displayValue;
}
