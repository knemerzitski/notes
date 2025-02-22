import {
  useEffect,
  useRef,
  Ref,
  useCallback,
  useState,
  ForwardedRef,
  MutableRefObject,
} from 'react';

export interface UseOnIntersectingOptions {
  /**
   * How many times can element be intersected before observer is disconnected.
   * @default Infinity
   */
  intersectionLimit?: number;
  /**
   * Reset intersection limit
   */
  provideReset?: (reset: () => void) => void;
}

export function useOnIntersecting<T extends Element>(
  ref: ForwardedRef<T> | MutableRefObject<T>,
  callback: () => void,
  options?: UseOnIntersectingOptions
): Ref<T> {
  const { intersectionLimit = Infinity } = options ?? {};

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [node, setNode] = useState<T | null>(null);

  const provideResetRef = useRef(options?.provideReset);
  provideResetRef.current = options?.provideReset;

  const stateRef = useRef({
    intersectionCount: 0,
  });

  const interceptedRef = useCallback(
    (node: T) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref != null) {
        ref.current = node;
      }

      setNode(node);
    },
    [ref]
  );

  useEffect(() => {
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        stateRef.current.intersectionCount++;
        callbackRef.current();

        if (stateRef.current.intersectionCount >= intersectionLimit) {
          observer.unobserve(node);
        }
      }
    });

    provideResetRef.current?.(() => {
      if (stateRef.current.intersectionCount >= intersectionLimit) {
        observer.observe(node);
      }
      stateRef.current.intersectionCount = 0;
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, intersectionLimit]);

  return interceptedRef;
}
