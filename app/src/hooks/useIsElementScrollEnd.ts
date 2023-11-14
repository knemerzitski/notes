import { useCallback, useEffect, useState } from 'react';

export default function useIsElementScrollEnd(el?: HTMLElement) {
  const [isScrollEnd, setIsScrollEnd] = useState<boolean>();

  const updateIsScrollEnd = useCallback(() => {
    if (!el) return;

    setIsScrollEnd(el.scrollTop >= el.scrollHeight - el.clientHeight);
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
    () => {
      resizeObserver.disconnect();
    };
  }, [el, updateIsScrollEnd]);

  return isScrollEnd;
}
