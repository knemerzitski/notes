import { useCallback, useEffect, useRef, useState } from 'react';

import { isDescendant } from '../is-descentant';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useDescentantUnfocusedListener<T extends Element>(
  onUnfocused: () => void,
  options?: {
    /**
     * Ignore first focus event after ref has been set
     * @default false
     */
    ignoreFirstFocus?: boolean;
  }
): (node: T | null) => void {
  const ignoreFirstFocus = options?.ignoreFirstFocus;

  const [node, setNode] = useState<T | null>(null);

  const onUnfocusedRef = useRef(onUnfocused);
  onUnfocusedRef.current = onUnfocused;

  const ref = useCallback((node: T | null) => {
    setNode(node);
  }, []);

  useEffect(() => {
    if (!node) return;
    const parentNode = node;

    let ignoredFirstFocus = false;

    function handleFocus(e: FocusEvent) {
      if (!ignoredFirstFocus && ignoreFirstFocus) {
        ignoredFirstFocus = true;
        return;
      }

      if (!isDescendant(parentNode, e.target)) {
        onUnfocusedRef.current();
      }
    }

    window.addEventListener('focusin', handleFocus);
    return () => {
      window.removeEventListener('focusin', handleFocus);
    };
  }, [node, ignoreFirstFocus]);

  return ref;
}
