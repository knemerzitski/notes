import { useCallback, useEffect, useState } from 'react';

function calcIsScrollEnd(node?: Element) {
  if (!node) {
    return;
  }

  return node.scrollTop >= node.scrollHeight - node.clientHeight;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useIsElementScrollEnd<T extends Element>(): {
  isScrollEnd?: boolean;
  ref: (node: T) => void;
} {
  const [node, setNode] = useState<T>();

  const ref = useCallback((node: T) => {
    setIsScrollEnd(calcIsScrollEnd(node));
    setNode(node);
  }, []);

  const [isScrollEnd, setIsScrollEnd] = useState<boolean>();

  const updateIsScrollEnd = useCallback(() => {
    if (!node) return;

    setIsScrollEnd(calcIsScrollEnd(node));
  }, [node]);

  useEffect(() => {
    if (!node) return;

    updateIsScrollEnd();

    node.addEventListener('scroll', updateIsScrollEnd);
    node.addEventListener('touchmove', updateIsScrollEnd);
    return () => {
      node.removeEventListener('scroll', updateIsScrollEnd);
      node.removeEventListener('touchmove', updateIsScrollEnd);
    };
  }, [node, updateIsScrollEnd]);

  useEffect(() => {
    if (!node) return;

    const parentNode = node.parentElement;
    if (!parentNode) return;

    const resizeObserver = new ResizeObserver(updateIsScrollEnd);

    resizeObserver.observe(parentNode);
    return () => {
      resizeObserver.disconnect();
    };
  }, [node, updateIsScrollEnd]);

  return {
    isScrollEnd,
    ref: ref,
  };
}
