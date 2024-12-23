import { useEffect, useState } from 'react';

function calcIsScrollEnd() {
  return window.scrollY >= document.body.scrollHeight - window.innerHeight;
}

export function useIsScrollEnd() {
  const [isScrollEnd, setIsScrollEnd] = useState<boolean>(calcIsScrollEnd());

  useEffect(() => {
    function handleScroll() {
      setIsScrollEnd(calcIsScrollEnd());
    }

    handleScroll();
    setTimeout(() => {
      handleScroll();
    }, 0);

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchmove', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  return isScrollEnd;
}
