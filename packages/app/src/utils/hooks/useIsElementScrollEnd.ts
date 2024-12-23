import { useCallback, useEffect, useState } from 'react';

function calcIsScrollEnd(el?: HTMLElement) {
  if (!el) {
    return null;
  }

  return el.scrollTop >= el.scrollHeight - el.clientHeight;
}

export function useIsElementScrollEnd(el?: HTMLElement) {
  const [isScrollEnd, setIsScrollEnd] = useState<boolean | null>(calcIsScrollEnd(el));

  const updateIsScrollEnd = useCallback(() => {
    if (!el) return;

    setIsScrollEnd(calcIsScrollEnd(el));
  }, [el]);

  useEffect(() => {
    if (!el) return;

    updateIsScrollEnd();

    el.addEventListener('scroll', updateIsScrollEnd);
    el.addEventListener('touchmove', updateIsScrollEnd);
    return () => {
      el.removeEventListener('scroll', updateIsScrollEnd);
      el.removeEventListener('touchmove', updateIsScrollEnd);
    };
  }, [el, updateIsScrollEnd]);

  useEffect(() => {
    if (!el) return;

    const parentEl = el.parentElement;
    if (!parentEl) return;

    const resizeObserver = new ResizeObserver(updateIsScrollEnd);

    resizeObserver.observe(parentEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, [el, updateIsScrollEnd]);

  return isScrollEnd;
}
