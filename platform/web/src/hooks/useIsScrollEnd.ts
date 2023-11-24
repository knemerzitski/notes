import { useEffect, useState } from 'react';

export default function useIsScrollEnd() {
  const [isScrollEnd, setIsScrollEnd] = useState<boolean>();

  useEffect(() => {
    function handleScroll() {
      setIsScrollEnd(window.scrollY >= document.body.scrollHeight - window.innerHeight);
    }

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchmove', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  return isScrollEnd;
}
